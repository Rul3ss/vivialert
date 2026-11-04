import type { PriceResult } from './price-evaluation';

export interface NotificationInput {
  price: number;
  result: PriceResult;
  lastNotifiedPrice: number | null;
}

/** Centavos evitam que dízimas do `numeric(10,2)` contem como "preço mudou". */
const cents = (value: number) => Math.round(value * 100);

/**
 * Decide se um preço merece aviso.
 *
 * Avisa sempre que o preço está na faixa do alerta e é diferente do último
 * valor avisado — para cima ou para baixo. O mesmo valor não é repetido.
 *
 * Nunca avisa em ABOVE_TARGET.
 */
export function shouldNotify({
  price,
  result,
  lastNotifiedPrice,
}: NotificationInput): boolean {
  if (result === 'ABOVE_TARGET') return false;
  if (lastNotifiedPrice === null) return true;
  return cents(price) !== cents(lastNotifiedPrice);
}
