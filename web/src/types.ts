/** Espelha os enums do backend (`price-evaluation.ts`). */
export type PriceResult = 'OFFER' | 'NEAR_TARGET' | 'ABOVE_TARGET';

export interface Alert {
  id: string;
  origin: string;
  destination: string;
  /** Data pura (YYYY-MM-DD), sem fuso. */
  departureDate: string;
  /** Data pura (YYYY-MM-DD), sem fuso. */
  returnDate: string;
  targetPrice: number;
  active: boolean;
  lastNotifiedPrice: number | null;
  lastNotifiedLevel: PriceResult | null;
  lastNotifiedAt: string | null;
  lastCheckedAt: string | null;
  /** Último erro do vigia (provedor fora, cota...); `null` = tudo certo. */
  lastError: string | null;
  consecutiveFailures: number;
  createdAt: string;
}

export interface CreateAlertInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  targetPrice: number;
}

export interface UpdateAlertInput {
  targetPrice?: number;
  active?: boolean;
}

export interface Airport {
  /** Código IATA de 3 letras. */
  iata: string;
  city: string;
  name: string;
  /** Sigla do estado (UF). */
  state: string;
}

export interface PricePoint {
  id: string;
  /** `null` quando não havia oferta naquela consulta (nunca preço zero). */
  price: number | null;
  currency: string;
  departureDate: string | null;
  returnDate: string | null;
  airline: string | null;
  source: string | null;
  found: boolean;
  checkedAt: string;
}

export interface CheckResult {
  alert: Alert;
  priceCheck: PricePoint;
  /** `null` quando não houve oferta. */
  result: PriceResult | null;
  notified: boolean;
}

export interface WatchStatus {
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  running: boolean;
}
