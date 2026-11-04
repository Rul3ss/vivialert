export type PriceResult = 'OFFER' | 'NEAR_TARGET' | 'ABOVE_TARGET';

export const TOLERANCE = 0.1; // 10%

export function evaluatePrice(
  price: number,
  targetPrice: number,
  tolerance = TOLERANCE,
): PriceResult {
  if (price <= targetPrice) return 'OFFER';
  if (price <= targetPrice * (1 + tolerance)) return 'NEAR_TARGET';
  return 'ABOVE_TARGET';
}