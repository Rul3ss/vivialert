import { evaluatePrice } from './price-evaluation';

describe('evaluatePrice', () => {
  it('é oferta quando o preço está igual ou abaixo do alvo', () => {
    expect(evaluatePrice(900, 900)).toBe('OFFER');
    expect(evaluatePrice(800, 900)).toBe('OFFER');
  });

  it('é perto do alvo quando está até 10% acima', () => {
    expect(evaluatePrice(950, 900)).toBe('NEAR_TARGET');
  });

  it('fica acima do alvo quando passa de 10%', () => {
    expect(evaluatePrice(1000, 900)).toBe('ABOVE_TARGET');
  });
});