export interface PriceQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
}

export interface PriceProvider {
  getRoundTripPrice(query: PriceQuery): Promise<number>;
}

export const PRICE_PROVIDER = 'PRICE_PROVIDER';