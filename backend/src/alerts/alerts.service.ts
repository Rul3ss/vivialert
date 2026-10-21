import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PRICE_PROVIDER } from '../prices/price-provider.interface';
import type { PriceProvider } from '../prices/price-provider.interface';
import { PriceCheck } from './price-check.entity';
import { evaluatePrice } from './price-evaluation';
import { TelegramService } from '../notifications/telegram.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alerts: Repository<Alert>,
    @InjectRepository(PriceCheck)
    private readonly priceChecks: Repository<PriceCheck>,
    @Inject(PRICE_PROVIDER)
    private readonly priceProvider: PriceProvider,
    private readonly telegram: TelegramService,
  ) {}

  create(dto: CreateAlertDto) {
    if (dto.returnDate <= dto.departureDate) {
      throw new BadRequestException('A volta precisa ser depois da ida.');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (dto.departureDate < today) {
      throw new BadRequestException('A ida não pode estar no passado.');
    }

    const alert = this.alerts.create({
      origin: dto.origin.toUpperCase(),
      destination: dto.destination.toUpperCase(),
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      targetPrice: dto.targetPrice.toFixed(2),
    });
    return this.alerts.save(alert);
  }

  findAll() {
    return this.alerts.find({ order: { createdAt: 'DESC' } });
  }

  async checkPrice(id: string) {
  const alert = await this.alerts.findOneBy({ id });
  if (!alert) {
    throw new NotFoundException('Alerta não encontrado.');
  }

  const price = await this.priceProvider.getRoundTripPrice({
    origin: alert.origin,
    destination: alert.destination,
    departureDate: alert.departureDate,
    returnDate: alert.returnDate,
  });

  const check = this.priceChecks.create({ alert, price: price.toFixed(2) });
  const saved = await this.priceChecks.save(check);
  const result = evaluatePrice(price, Number(alert.targetPrice));

  if (result !== 'ABOVE_TARGET') {
  const label = result === 'OFFER' ? 'Oferta!' : 'Perto do alvo';
  await this.telegram.send(
    `${label}\n${alert.origin} → ${alert.destination}\n` +
      `Ida ${alert.departureDate} · Volta ${alert.returnDate}\n` +
      `Preço total: R$ ${price.toFixed(2)} (alvo: R$ ${alert.targetPrice})`,
  );
}

  return { priceCheck: saved, result };
}

findPrices(id: string) {
  return this.priceChecks.find({
    where: { alert: { id } },
    order: { checkedAt: 'DESC' },
  });
}
}