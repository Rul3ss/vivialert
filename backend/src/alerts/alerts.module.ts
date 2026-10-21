import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './alert.entity';
import { PriceCheck } from './price-check.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { PricesModule } from '../prices/prices.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [TypeOrmModule.forFeature([Alert, PriceCheck]), PricesModule, NotificationsModule,],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}