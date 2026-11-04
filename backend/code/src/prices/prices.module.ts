import { Logger, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FakePriceProvider } from './fake-price.provider';
import { SerpApiPriceProvider } from './serpapi-price.provider';
import { PRICE_PROVIDER } from './price-provider.interface';
import type { PriceProvider } from './price-provider.interface';

/**
 * Escolha do provedor: `PRICE_PROVIDER=fake|serpapi`.
 *
 * O padrão é `fake` — mas, ao contrário do que acontecia antes, o vigia e a
 * tela deixam isso explícito (`/health` e o status dizem "preço simulado"),
 * então nunca é possível confundir preço fake com oferta real.
 *
 * `serpapi` sem `SERPAPI_KEY` falha na primeira consulta com uma mensagem
 * clara, em vez de subir e sortear preços em silêncio.
 */
function escolherProvedor(dataSource: DataSource): PriceProvider {
  const escolhido = (process.env.PRICE_PROVIDER ?? 'fake').trim().toLowerCase();

  if (escolhido === 'serpapi') {
    if (!process.env.SERPAPI_KEY?.trim()) {
      new Logger('PricesModule').warn(
        'PRICE_PROVIDER=serpapi sem SERPAPI_KEY: as checagens vão falhar até a chave ser configurada.',
      );
    }
    return new SerpApiPriceProvider(dataSource);
  }

  if (escolhido !== 'fake') {
    new Logger('PricesModule').warn(
      `PRICE_PROVIDER="${escolhido}" desconhecido; usando "fake".`,
    );
  }
  return new FakePriceProvider();
}

@Module({
  providers: [
    {
      provide: PRICE_PROVIDER,
      useFactory: escolherProvedor,
      inject: [DataSource],
    },
  ],
  exports: [PRICE_PROVIDER],
})
export class PricesModule {}
