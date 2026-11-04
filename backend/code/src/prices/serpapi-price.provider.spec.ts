import { Logger } from '@nestjs/common';
import { SerpApiPriceProvider } from './serpapi-price.provider';
import type { PriceQuery } from './price-provider.interface';

type RespostaFetch = Awaited<ReturnType<typeof fetch>>;

function resposta(status: number, corpo: unknown): RespostaFetch {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo),
  } as unknown as RespostaFetch;
}

const CONSULTA: PriceQuery = {
  origin: 'GRU',
  destination: 'SDU',
  departureDate: '2026-12-01',
  returnDate: '2026-12-08',
  tripType: 'round_trip',
};

describe('SerpApiPriceProvider', () => {
  const envOriginal = { ...process.env };
  const fetchMock = jest.fn<Promise<RespostaFetch>, Parameters<typeof fetch>>();
  const fetchOriginal = globalThis.fetch;
  let provider: SerpApiPriceProvider;

  beforeEach(() => {
    process.env.SERPAPI_KEY = 'chave-teste';
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    provider = new SerpApiPriceProvider();
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  function urlDaChamada(): URL {
    return new URL(fetchMock.mock.calls[0]?.[0] as string);
  }

  it('faz uma única requisição por checagem', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, { best_flights: [{ price: 900 }] }),
    );

    await provider.buscarMenorPreco(CONSULTA);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pede ida e volta exatas (sem departure_token)', async () => {
    fetchMock.mockResolvedValue(resposta(200, { best_flights: [{ price: 500 }] }));

    await provider.buscarMenorPreco(CONSULTA);

    const url = urlDaChamada();
    expect(url.searchParams.get('engine')).toBe('google_flights');
    expect(url.searchParams.get('type')).toBe('1');
    expect(url.searchParams.get('departure_id')).toBe('GRU');
    expect(url.searchParams.get('arrival_id')).toBe('SDU');
    expect(url.searchParams.get('outbound_date')).toBe('2026-12-01');
    expect(url.searchParams.get('return_date')).toBe('2026-12-08');
    expect(url.searchParams.get('currency')).toBe('BRL');
    expect(url.searchParams.get('departure_token')).toBeNull();
  });

  it('devolve o menor preço entre os itinerários', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, {
        best_flights: [{ price: 900 }, { price: 640 }],
        other_flights: [{ price: 820 }],
      }),
    );

    const cotacao = await provider.buscarMenorPreco(CONSULTA);

    expect(cotacao?.price).toBe(640);
    expect(cotacao?.departureDate).toBe('2026-12-01');
    expect(cotacao?.returnDate).toBe('2026-12-08');
  });

  it('usa other_flights quando best_flights vem vazio', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, { best_flights: [], other_flights: [{ price: 780 }] }),
    );

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toMatchObject({
      price: 780,
    });
  });

  it('ignora itinerário sem preço', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, { best_flights: [{}, { price: 700 }] }),
    );

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toMatchObject({
      price: 700,
    });
  });

  it('sem oferta devolve null (não zero)', async () => {
    fetchMock.mockResolvedValue(resposta(200, { best_flights: [] }));

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toBeNull();
  });

  it('"nenhum resultado" da SerpApi é sem oferta, não falha', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, {
        error: "Google Flights hasn't returned any results for this query.",
      }),
    );

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toBeNull();
  });

  it('"nenhum resultado" com apóstrofo curvo também é sem oferta', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, {
        error: 'Google Flights hasn’t returned any results for this query.',
      }),
    );

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toBeNull();
  });

  it('erro de chave inválida tem mensagem própria', async () => {
    fetchMock.mockResolvedValue(resposta(401, {}));

    await expect(provider.buscarMenorPreco(CONSULTA)).rejects.toThrow(
      /SERPAPI_KEY/,
    );
  });

  it('erro de cota tem mensagem própria', async () => {
    fetchMock.mockResolvedValue(resposta(429, {}));

    await expect(provider.buscarMenorPreco(CONSULTA)).rejects.toThrow(/cota/);
  });

  it('erro HTTP genérico vira exceção', async () => {
    fetchMock.mockResolvedValue(resposta(500, {}));

    await expect(provider.buscarMenorPreco(CONSULTA)).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it('erro devolvido no corpo JSON vira exceção', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, { error: 'Invalid parameter' }),
    );

    await expect(provider.buscarMenorPreco(CONSULTA)).rejects.toThrow(
      /Invalid parameter/,
    );
  });

  it('exige SERPAPI_KEY configurada', async () => {
    delete process.env.SERPAPI_KEY;

    await expect(provider.buscarMenorPreco(CONSULTA)).rejects.toThrow(
      /SERPAPI_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('alterna entre as chaves a cada checagem (round robin)', async () => {
    process.env.SERPAPI_KEY = 'chave-a, chave-b';
    fetchMock.mockResolvedValue(resposta(200, { best_flights: [{ price: 500 }] }));

    await provider.buscarMenorPreco(CONSULTA);
    await provider.buscarMenorPreco(CONSULTA);
    await provider.buscarMenorPreco(CONSULTA);

    const chavesUsadas = fetchMock.mock.calls.map((chamada) =>
      new URL(chamada[0] as string).searchParams.get('api_key'),
    );
    expect(chavesUsadas).toEqual(['chave-a', 'chave-b', 'chave-a']);
  });

  it('pula a chave sem cota e usa a próxima', async () => {
    process.env.SERPAPI_KEY = 'chave-a,chave-b';
    fetchMock
      .mockResolvedValueOnce(resposta(429, {}))
      .mockResolvedValueOnce(resposta(200, { best_flights: [{ price: 500 }] }));

    await expect(provider.buscarMenorPreco(CONSULTA)).resolves.toMatchObject({
      price: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gera link do Google Flights com as datas', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, { best_flights: [{ price: 500 }] }),
    );

    const cotacao = await provider.buscarMenorPreco(CONSULTA);

    expect(cotacao?.sourceUrl).toContain('google.com/travel/flights');
    const busca = decodeURIComponent(cotacao?.sourceUrl ?? '');
    expect(busca).toContain('2026-12-01');
    expect(busca).toContain('2026-12-08');
  });

  it('traz a companhia do primeiro trecho', async () => {
    fetchMock.mockResolvedValue(
      resposta(200, {
        best_flights: [{ price: 500, flights: [{ airline: 'LATAM' }] }],
      }),
    );

    const cotacao = await provider.buscarMenorPreco(CONSULTA);

    expect(cotacao?.airline).toBe('LATAM');
  });
});
