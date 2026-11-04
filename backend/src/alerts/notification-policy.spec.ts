import { shouldNotify } from './notification-policy';

describe('shouldNotify', () => {
  it('nunca avisa quando o preço está acima do alvo', () => {
    expect(
      shouldNotify({
        price: 6000,
        result: 'ABOVE_TARGET',
        lastNotifiedPrice: null,
      }),
    ).toBe(false);
    expect(
      shouldNotify({
        price: 6000,
        result: 'ABOVE_TARGET',
        lastNotifiedPrice: 2100,
      }),
    ).toBe(false);
  });

  it('avisa na primeira vez que o preço entra no alvo', () => {
    expect(
      shouldNotify({ price: 900, result: 'OFFER', lastNotifiedPrice: null }),
    ).toBe(true);
  });

  it('avisa na primeira vez que o preço fica perto do alvo', () => {
    expect(
      shouldNotify({
        price: 950,
        result: 'NEAR_TARGET',
        lastNotifiedPrice: null,
      }),
    ).toBe(true);
  });

  it('avisa quando o preço sobe mas continua abaixo do alvo', () => {
    expect(
      shouldNotify({ price: 2100, result: 'OFFER', lastNotifiedPrice: 2000 }),
    ).toBe(true);
  });

  it('avisa quando o preço cai em relação ao último aviso', () => {
    expect(
      shouldNotify({ price: 2000, result: 'OFFER', lastNotifiedPrice: 2100 }),
    ).toBe(true);
  });

  it('não repete o aviso com o mesmo preço', () => {
    expect(
      shouldNotify({ price: 2100, result: 'OFFER', lastNotifiedPrice: 2100 }),
    ).toBe(false);
  });

  it('não considera mudança de centavos por dízima como preço novo', () => {
    expect(
      shouldNotify({
        price: 2100.004,
        result: 'OFFER',
        lastNotifiedPrice: 2100,
      }),
    ).toBe(false);
  });

  it('avisa quando o preço muda perto do alvo', () => {
    expect(
      shouldNotify({
        price: 5200,
        result: 'NEAR_TARGET',
        lastNotifiedPrice: 5100,
      }),
    ).toBe(true);
  });
});
