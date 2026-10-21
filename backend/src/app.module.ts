import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsModule } from './alerts/alerts.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
