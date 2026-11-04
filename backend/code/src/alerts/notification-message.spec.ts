import { montarMensagem } from './notification-message';

describe('mensagem de aviso', () => {
  const base = {
    result: 'OFFER' as const,
    price: 1899.9,
    targetPrice: 2000,
    origin: 'GRU',
    destination: 'SSA',
    departureDate: '2026-12-01',
    returnDate: '2026-12-08',
    airline: 'GOL',
    sourceUrl: 'https://www.google.com/travel/flights?q=teste',
    simulated: false,
  };

  it('traz datas, preço, companhia e link', () => {
    const texto = montarMensagem(base);

    expect(texto).toContain('Oferta abaixo do alvo');
    expect(texto).toContain('GRU → SSA');
    expect(texto).toContain('01/12/2026');
    expect(texto).toContain('08/12/2026');
    expect(texto).toContain('GOL');
    expect(texto).toContain('https://www.google.com/travel/flights');
    expect(texto).toContain('R$');
  });

  it('marca preço simulado de forma impossível de confundir', () => {
    expect(montarMensagem({ ...base, simulated: true })).toContain('SIMULADO');
    expect(montarMensagem(base)).not.toContain('SIMULADO');
  });

  it('não inventa link nem companhia quando o provedor não devolve', () => {
    const texto = montarMensagem({ ...base, airline: null, sourceUrl: null });

    expect(texto).not.toContain('Companhia:');
    expect(texto).not.toContain('Conferir e comprar');
  });

  it('perto do alvo usa outro título', () => {
    expect(montarMensagem({ ...base, result: 'NEAR_TARGET' })).toContain(
      'Perto do alvo',
    );
  });
});
