import { Injectable } from '@nestjs/common';
import type { PriceProvider } from './price-provider.interface';

@Injectable()
export class FakePriceProvider implements PriceProvider {
  async getRoundTripPrice(): Promise<number> {
    // preço de teste: sorteia um valor entre 700 e 1500
    const price = 700 + Math.random() * 800;
    return Math.round(price * 100) / 100;
  }
}