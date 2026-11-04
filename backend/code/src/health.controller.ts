import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PRICE_PROVIDER } from './prices/price-provider.interface';
import type { PriceProvider } from './prices/price-provider.interface';
import { hoje } from './common/date';
import { VARIAVEIS_OBRIGATORIAS, watchEnabled } from './config/env';

interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'ok' | 'down';
  priceProvider: string;
  /** `false` = preço simulado; nunca confundir com oferta real. */
  priceProviderReal: boolean;
  watchEnabled: boolean;
  today: string;
  missingConfig: string[];
}

/**
 * `/health`: usado pelo healthcheck do Docker e pelo deploy.
 *
 * Devolve 200 só se o banco responder; o resto é diagnóstico. Também expõe se
 * o preço é simulado — o modo mais silencioso de falha deste projeto é rodar
 * semanas com o provedor fake achando que os preços são reais.
 */
@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(PRICE_PROVIDER) private readonly priceProvider: PriceProvider,
  ) {}

  @Get('health')
  async health(): Promise<HealthResponse> {
    let database: 'ok' | 'down' = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      database = 'ok';
    } catch {
      database = 'down';
    }

    const missingConfig: string[] = VARIAVEIS_OBRIGATORIAS.filter(
      (nome) => !process.env[nome]?.trim(),
    );

    if (this.priceProvider.nome === 'serpapi' && !process.env.SERPAPI_KEY?.trim()) {
      missingConfig.push('SERPAPI_KEY');
    }

    const resposta: HealthResponse = {
      status: database === 'ok' && missingConfig.length === 0 ? 'ok' : 'degraded',
      database,
      priceProvider: this.priceProvider.nome,
      priceProviderReal: this.priceProvider.nome !== 'fake',
      watchEnabled: watchEnabled(),
      today: hoje(),
      missingConfig,
    };

    if (database === 'down') {
      throw new ServiceUnavailableException(resposta);
    }
    return resposta;
  }
}
