import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  PriceProvider,
  PriceQuery,
  PriceQuote,
} from './price-provider.interface';

/**
 * SerpApi · Google Flights: `engine=google_flights`.
 *
 * Uma busca por checagem: `type=1` + `outbound_date` + `return_date` já devolve
 * itinerários de ida e volta com o `price` TOTAL, que é exatamente a consulta
 * que o Google Flights faz para um par de datas. O `departure_token` só seria
 * necessário para escolher segmentos de volta, o que não é o caso aqui.
 */

interface ItinerarioSerpApi {
  price?: number;
  flights?: {
    departure_airport?: { id?: string; time?: string };
    airline?: string;
  }[];
}

interface RespostaSerpApi {
  error?: string;
  best_flights?: ItinerarioSerpApi[];
  other_flights?: ItinerarioSerpApi[];
}

@Injectable()
export class SerpApiPriceProvider implements PriceProvider {
  readonly nome = 'serpapi';

  private readonly logger = new Logger(SerpApiPriceProvider.name);

  /** Posição da próxima chave quando não há banco (testes) ou ele falha. */
  private proxima = 0;

  constructor(private readonly dataSource?: DataSource) {}

  /**
   * Posição do rodízio guardada no banco: sobrevive a reinícios da API e o
   * incremento é atômico. Sem banco (ou se ele falhar), usa a memória.
   */
  private async proximoIndice(total: number): Promise<number> {
    if (this.dataSource) {
      try {
        const linhas: { counter: string }[] = await this.dataSource.query(
          `INSERT INTO "serpapi_key_rotation" ("id", "counter") VALUES (1, 1)
           ON CONFLICT ("id") DO UPDATE
           SET "counter" = "serpapi_key_rotation"."counter" + 1
           RETURNING "counter"`,
        );
        return (Number(linhas[0].counter) - 1) % total;
      } catch (erro) {
        this.logger.warn(
          `Rodízio de chaves sem banco, usando memória: ${(erro as Error).message}`,
        );
      }
    }
    const indice = this.proxima % total;
    this.proxima = (indice + 1) % total;
    return indice;
  }

  /**
   * `SERPAPI_KEY` aceita uma ou várias chaves separadas por vírgula:
   *   SERPAPI_KEY=chave1,chave2,chave3
   */
  private chaves(): string[] {
    return (process.env.SERPAPI_KEY ?? '')
      .split(',')
      .map((chave) => chave.trim())
      .filter((chave) => chave.length > 0);
  }

  async buscarMenorPreco(query: PriceQuery): Promise<PriceQuote | null> {
    const chaves = this.chaves();
    if (chaves.length === 0) {
      throw new Error(
        'SERPAPI_KEY não configurada: escolha PRICE_PROVIDER=fake para rodar sem preço real.',
      );
    }

    // Cada checagem usa a próxima chave da lista. Se a chave estiver sem cota
    // ou for recusada, tenta a seguinte, até ter testado todas.
    let resposta: Awaited<ReturnType<typeof fetch>> | null = null;
    for (let tentativa = 0; tentativa < chaves.length; tentativa++) {
      const indice = await this.proximoIndice(chaves.length);

      resposta = await this.consultar(query, chaves[indice]);

      const chaveFalhou =
        resposta.status === 401 ||
        resposta.status === 403 ||
        resposta.status === 429;
      if (!chaveFalhou) break;

      this.logger.warn(
        `Chave SerpApi nº ${indice + 1} falhou (HTTP ${resposta.status}); tentando a próxima.`,
      );
    }

    if (!resposta) {
      throw new Error('SerpApi: nenhuma chave disponível.');
    }
    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error('SerpApi recusou a chave (confira SERPAPI_KEY).');
    }
    if (resposta.status === 429) {
      throw new Error('SerpApi: cota/limite de requisições atingido.');
    }
    if (!resposta.ok) {
      throw new Error(`SerpApi respondeu HTTP ${resposta.status}.`);
    }

    const corpo = (await resposta.json()) as RespostaSerpApi;
    if (corpo.error) {
      // "Nenhum resultado" chega como `error`, mas é só ausência de voo.
      if (/hasn.t returned any results/i.test(corpo.error)) {
        return null;
      }
      throw new Error(`SerpApi: ${corpo.error}`);
    }

    // `best_flights` primeiro; se vier vazio, `other_flights` ainda é válido.
    const itens = [...(corpo.best_flights ?? []), ...(corpo.other_flights ?? [])];
    const comPreco = itens.filter(
      (item) => typeof item.price === 'number' && item.price > 0,
    );
    if (comPreco.length === 0) {
      return null; // sem oferta nestas datas: não é preço zero
    }

    const menor = comPreco.reduce((a, b) =>
      (a.price ?? 0) <= (b.price ?? 0) ? a : b,
    );

    this.logger.log(
      `${query.origin}→${query.destination} ${query.departureDate}/${query.returnDate}: ` +
        `R$ ${(menor.price ?? 0).toFixed(2)}`,
    );

    return {
      price: menor.price ?? 0,
      currency: 'BRL',
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      airline: this.companhia(menor),
      sourceUrl: this.linkDeBusca(query),
      source: this.nome,
    };
  }

  private consultar(query: PriceQuery, apiKey: string) {
    const parametros = new URLSearchParams({
      engine: 'google_flights',
      departure_id: query.origin,
      arrival_id: query.destination,
      outbound_date: query.departureDate,
      return_date: query.returnDate,
      type: '1', // ida e volta
      travel_class: '1', // econômica
      currency: 'BRL',
      hl: 'pt-BR',
      gl: 'br',
      api_key: apiKey,
    });

    const url = `https://serpapi.com/search?${parametros.toString()}`;
    return fetch(url, { signal: AbortSignal.timeout(60_000) });
  }

  private companhia(itinerario: ItinerarioSerpApi): string | null {
    return itinerario.flights?.[0]?.airline ?? null;
  }

  /**
   * Link para a pessoa conferir no próprio Google Flights, na mesma ida e
   * volta que gerou o aviso.
   */
  private linkDeBusca(query: PriceQuery): string {
    const base = 'https://www.google.com/travel/flights';
    const busca = `Flights from ${query.origin} to ${query.destination} on ${query.departureDate} through ${query.returnDate}`;
    return `${base}?q=${encodeURIComponent(busca)}&hl=pt-BR&gl=BR&curr=BRL`;
  }
}
