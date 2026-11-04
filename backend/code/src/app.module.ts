import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AlertsModule } from './alerts/alerts.module';
import { AirportsModule } from './airports/airports.module';
import { HealthController } from './health.controller';
import { PricesModule } from './prices/prices.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // useFactory (e não forRoot) para ler o DATABASE_URL depois do
      // loadEnvFileSafe(), que roda no bootstrap.
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: false,
        migrations: [join(__dirname, 'database/migration/*{.ts,.js}')],
        // Roda as migrations pendentes no boot: clone novo já sobe com o banco pronto.
        migrationsRun: true,
      }),
    }),
    AlertsModule,
    AirportsModule,
    // HealthController e NotificationsController injetam destes módulos.
    PricesModule,
    NotificationsModule,
  ],
  controllers: [HealthController, NotificationsController],
})
export class AppModule {}
