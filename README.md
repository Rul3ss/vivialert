# TripAlert

Monitor de preços de passagens aéreas que avisa por **Telegram** quando o valor de um trecho
fica igual ou próximo do alvo definido.

> ⚠️ O provedor de preços atual é **simulado** (`FakePriceProvider`, aleatório entre R$ 700 e R$ 1.500).
> Ele existe para desenvolvimento/teste da arquitetura. A troca por um provedor real é a Fase 1 do roadmap.

## Como funciona

```
POST /alerts  ──▶ alerts (Postgres)
                     │
POST /alerts/:id/check
                     ▼
            PRICE_PROVIDER (fake hoje, real na Fase 1)
                     ▼
            evaluatePrice()  ── OFFER / NEAR_TARGET / ABOVE_TARGET
                     ▼
        TelegramService.send()  ──▶ Bot API ──▶ sua conversa
```

- `OFFER`: preço ≤ alvo
- `NEAR_TARGET`: até 10% acima do alvo (notifica)
- `ABOVE_TARGET`: não notifica

## Stack

NestJS 12 · TypeORM 1.x + Postgres 16 · Docker Compose · class-validator · Jest · oxlint

## Quick start

Pré-requisitos: Docker + Docker Compose.

```bash
git clone <url-do-repo> && cd tripalert
cp .env.example .env
# preencha TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env
docker compose up -d --build
curl http://localhost:3000/          # Hello World!
```

O banco é criado automaticamente: as **migrations rodam no boot** da API (`migrationsRun: true`),
então um clone novo não precisa de passo manual.

### 1. Criar o bot no Telegram

1. Fale com o [@BotFather](https://t.me/BotFather) e envie `/newbot`.
2. Escolha nome e username; ele devolve o token → `TELEGRAM_BOT_TOKEN`.
3. **Envie uma mensagem qualquer para o seu bot** (`oi`). O Telegram não permite que um bot
   inicie conversa: só é possível enviar mensagem para quem já falou com ele.
4. Descubra o seu `chat_id` com o token em mãos:

```bash
curl "https://api.telegram.org/bot<SEU_TOKEN>/getUpdates"
# procure por "chat": { "id": 123456789, ... } → esse número é o TELEGRAM_CHAT_ID
```

> Alternativa: mande `/start` para o [@userinfobot](https://t.me/userinfobot), ele responde com o seu ID.

### 2. Rodando sem Docker (opcional)

Requer Node >= 20.12 (o `.env` é carregado via `process.loadEnvFile`).

```bash
cd backend
pnpm install
pnpm start:dev
```

Nesse modo o `.env` da raiz é carregado automaticamente, mas é preciso definir `DATABASE_URL`
apontando para um Postgres acessível (no Docker ela é montada pelo compose):

```env
DATABASE_URL=postgresql://tripalert:senha@localhost:5432/tripalert
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | ✅ | credenciais do Postgres usado pelo `docker-compose` |
| `DATABASE_URL` | ✅ | string de conexão lida pela API (o compose monta; fora do Docker defina no `.env`) |
| `TELEGRAM_BOT_TOKEN` | ✅ | token devolvido pelo @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ | `chat_id` de quem recebe os alertas |
| `PORT` | — | porta da API (padrão `3000`) |

Sem essas variáveis a API **não sobe** e diz exatamente o que falta (`src/config/env.ts`).

## Endpoints

```bash
# criar alerta
curl -X POST http://localhost:3000/alerts \
  -H 'Content-Type: application/json' \
  -d '{"origin":"GRU","destination":"SDU","departureDate":"2026-12-01","returnDate":"2026-12-10","targetPrice":450}'

# listar alertas
curl http://localhost:3000/alerts

# checar preço agora (grava o histórico e notifica se estiver no alvo)
curl -X POST http://localhost:3000/alerts/<id>/check

# histórico de preços do alerta
curl http://localhost:3000/alerts/<id>/prices
```

## Estrutura

```
backend/src/
├── alerts/          # entidade, DTO, controller, service, avaliação de preço
├── prices/          # PriceProvider (interface + token de DI) e FakePriceProvider
├── notifications/   # TelegramService
├── database/        # data-source e migrations
└── config/          # carregamento e validação do ambiente
```

## Decisões de arquitetura

- **Single-tenant por instância**: cada instância atende um `TELEGRAM_CHAT_ID`. É o modelo
  self-hosted: quem clonar o repo põe o próprio bot e o próprio chat. `send(text, chatId)` já
  recebe o destinatário como parâmetro, então suportar N inscritos no futuro é adicionar uma
  tabela de subscribers e resolver o destinatário em um único ponto.
- **Provedor plugável**: `PRICE_PROVIDER` é um token de DI; trocar o fake por um provedor real
  (Travelpayouts, Amadeus, etc.) não mexe no restante do código.
- **Migrations versionadas** (nunca `synchronize: true`), executadas no boot.
- **Falha rápida na configuração** em vez de subir sem token e só avisar no envio.

## Roadmap

- [x] Fase 0 — repositório reprodutível: migrations no boot, validação de env, Docker de produção, logs úteis, README
- [ ] Fase 1 — agendamento (`@nestjs/schedule`), cooldown anti-spam, `PATCH`/`DELETE /alerts`, provedor de preços real, `GET /health`
- [ ] Fase 2 — múltiplos usuários (`telegram_subscribers` + webhook do Telegram)

## Testes

```bash
cd backend
pnpm test      # unitários
pnpm lint
# e2e: sobe o AppModule de verdade, então exige um Postgres acessível
DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco pnpm test:e2e
```

## Produção

```bash
docker build --target prod -t tripalert-api ./backend
docker run --env-file .env -p 3000:3000 tripalert-api
```

O `docker-compose.yml` usa o target `dev` (watch mode) para o desenvolvimento local.
