/**
 * Resultado de uma consulta de preço.
 *
 * Diferente da versão antiga, que devolvia só um número, aqui vai também de
 * onde o preço veio: sem `sourceUrl` a pessoa não consegue conferir e comprar,
 * e "conferir" é o que gera confiança no alerta.
 */
export interface PriceQuote {
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  airline: string | null;
  /** Link para abrir a busca com esse resultado. */
  sourceUrl: string | null;
  /** Quem respondeu (`serpapi`, `fake`, ...). */
  source: string;
}

/** Consulta de ida e volta com datas exatas, como no Google Flights. */
export interface PriceQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  tripType: 'round_trip';
}

export interface PriceProvider {
  /**
   * Devolve `null` quando não há oferta para as datas (voo lotado, ida no
   * passado). `null` NÃO é preço zero e nunca pode gerar notificação.
   */
  buscarMenorPreco(query: PriceQuery): Promise<PriceQuote | null>;

  /** Quem é este provedor (aparece no `/health` e no frontend). */
  readonly nome: string;
}

export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');
