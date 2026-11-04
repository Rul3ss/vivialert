import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvFileSafe, validateEnv } from './config/env';

const ORIGENS_PADRAO = 'http://localhost:5173';

/** CORS_ORIGIN aceita uma lista separada por vírgula (ex.: "http://localhost:5173,https://app.exemplo.com"). */
function origensPermitidas(): string[] {
  return (process.env.CORS_ORIGIN ?? ORIGENS_PADRAO)
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
}

async function bootstrap() {
  loadEnvFileSafe();
  validateEnv();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // O frontend roda em outra porta (Vite, 5173) e precisa de CORS liberado.
  // O header x-api-key precisa ser aceito explicitamente no preflight.
  app.enableCors({
    origin: origensPermitidas(),
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });
  // Desligamento gracioso: o vigia termina o ciclo pendente no SIGTERM,
  // que é o sinal que Fly/Docker enviam ao redeployar.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
