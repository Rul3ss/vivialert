import { Module } from '@nestjs/common';
import { FakePriceProvider } from './fake-price.provider';
import { PRICE_PROVIDER } from './price-provider.interface';

@Module({
  providers: [{ provide: PRICE_PROVIDER, useClass: FakePriceProvider }],
  exports: [PRICE_PROVIDER],
})
export class PricesModule {}