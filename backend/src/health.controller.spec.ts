import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import type { PriceProvider } from './prices/price-provider.interface';

describe('HealthController', () => {
  const envOriginal = { ...process.env };

  function criar(falharBanco = false, nomeProvedor = 'serpapi') {
    const dataSource = {
      query: jest.fn(async () => {
        if (falharBanco) throw new Error('banco fora');
        return [{ '?column?': 1 }];
      }),
    };
    const provider = { nome: nomeProvedor } as unknown as PriceProvider;
    return new HealthController(
      dataSource as unknown as DataSource,
      provider,
    );
  }

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://x';
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = '123';
    process.env.API_KEY = 'a'.repeat(32);
    process.env.SERPAPI_KEY = 'chave';
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('responde ok quando banco e configuração estão certos', async () => {
    const resposta = await criar().health();

    expect(resposta.status).toBe('ok');
    expect(resposta.database).toBe('ok');
    expect(resposta.priceProviderReal).toBe(true);
    expect(resposta.missingConfig).toEqual([]);
  });

  it('devolve datas no formato AAAA-MM-DD', async () => {
    const resposta = await criar().health();

    expect(resposta.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marca o preço como simulado quando o provedor é fake', async () => {
    const resposta = await criar(false, 'fake').health();

    expect(resposta.priceProviderReal).toBe(false);
  });

  it('lista o que falta de configuração (ex.: SERPAPI_KEY com serpapi)', async () => {
    delete process.env.SERPAPI_KEY;

    const resposta = await criar().health();

    expect(resposta.status).toBe('degraded');
    expect(resposta.missingConfig).toContain('SERPAPI_KEY');
  });

  it('responde 503 quando o banco não responde', async () => {
    await expect(criar(true).health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
