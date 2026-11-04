import { Injectable, Logger } from '@nestjs/common';
import type {
  PriceProvider,
  PriceQuery,
  PriceQuote,
} from './price-provider.interface';

/**
 * Provedor de desenvolvimento: sorteia um valor e ignora a rota.
 *
 * Existe para rodar o sistema sem gastar cota paga e para os testes. Nunca é
 * escolhido em produção por padrão — ver `prices.module.ts`.
 */
@Injectable()
export class FakePriceProvider implements PriceProvider {
  readonly nome = 'fake';

  private readonly logger = new Logger(FakePriceProvider.name);

  async buscarMenorPreco(query: PriceQuery): Promise<PriceQuote | null> {
    this.logger.warn(
      'Usando preço SIMULADO — os valores não são reais. Configure SERPAPI_KEY para valer.',
    );

    const price = Math.round((700 + Math.random() * 800) * 100) / 100;

    return {
      price,
      currency: 'BRL',
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      airline: null,
      sourceUrl: null,
      source: this.nome,
    };
  }
}
