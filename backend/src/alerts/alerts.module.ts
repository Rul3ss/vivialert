import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './alert.entity';
import { PriceCheck } from './price-check.entity';
import { AlertsController, WatchController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { PriceWatchService } from './price-watch.service';
import { PricesModule } from '../prices/prices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, PriceCheck]),
    PricesModule,
    NotificationsModule,
  ],
  controllers: [AlertsController, WatchController],
  providers: [AlertsService, PriceWatchService],
})
export class AlertsModule {}
