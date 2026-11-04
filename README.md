# ViviAlert

Monitor de preços de passagens aéreas que avisa por **Telegram** quando o valor de um trecho
fica igual ou próximo do alvo definido — **sem ninguém precisar abrir o sistema**.

> **Um alerta por vez.** O sistema acompanha um único trecho (limite da cota da API de preço).
> Para monitorar outro, exclua o atual e crie o novo.
>
> **Preço real ou simulado?** `PRICE_PROVIDER=serpapi` usa o Google Flights de verdade.
> `fake` (padrão em dev) sorteia valores e **o aviso sai marcado como SIMULADO**.

## Como funciona

```
POST /alerts (trecho + ida + volta + alvo)  ──▶ alerts (Postgres)
                                                    │
                    vigia automático (a cada N min) │  ou  POST /alerts/:id/check
                                                    ▼
                          PRICE_PROVIDER (SerpApi · Google Flights)
                             consulta as datas exatas de ida e volta
                                                    ▼
                   evaluatePrice()  ── OFFER / NEAR_TARGET / ABOVE_TARGET
                                                    ▼
              TelegramService.send()  ──▶ Bot API ──▶ conversa da pessoa
                          (com datas, preço, link para conferir)
```

- `OFFER`: preço ≤ alvo
- `NEAR_TARGET`: até 10% acima do alvo (notifica)
- `ABOVE_TARGET`: não notifica

O aviso acompanha o preço: sempre que uma checagem encontra um valor dentro da faixa (oferta ou perto
do alvo) **diferente do último valor avisado**, a pessoa recebe mensagem — inclusive se o preço subiu
e continua abaixo do alvo. Valor idêntico ao último aviso não é repetido, e preço acima da tolerância
de 10% nunca avisa (`backend/code/src/alerts/notification-policy.ts`).

### Datas

O alerta guarda **data de ida** e **data de volta** exatas, como o Google Flights. Cada checagem é
uma única consulta ao provedor, com essas duas datas.

### Vigia automático

`PriceWatchService` roda um ciclo a cada `CHECK_INTERVAL_MINUTES`:

- **nunca roda dois ciclos ao mesmo tempo** (um ciclo lento não empilha outro);
- **falha de uma consulta não derruba o ciclo**: o erro fica gravado no alerta e aparece na tela;
- **backoff**: depois de falhas seguidas, as tentativas espaçam (1, 2, 4, 8, 16 ciclos);
- **alerta cuja data de ida já passou é desativado** em vez de gastar consulta.

`WATCH_ENABLED=false` desliga o vigia (o botão "Checar preço" continua funcionando).

## Stack

NestJS 12 · TypeORM 1.x + Postgres 16 · React 19 + Vite 7 · Tailwind CSS 4 + daisyUI 5 · Docker Compose · class-validator · Jest · oxlint

Sem dependência de agendador: o vigia usa `setTimeout` gerenciado pelo ciclo de vida do Nest, e o
provedor usa o `fetch` nativo. O `package.json` do backend não ganhou nada na Fase 1.

## Quick start

Pré-requisitos: Docker + Docker Compose.

```bash
git clone <url-do-repo> && cd tripalert/backend/code
cp .env.example .env
```

No `.env`:

1. `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` (passos abaixo);
2. `API_KEY` — gere a sua: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`;
3. `PRICE_PROVIDER=serpapi` + `SERPAPI_KEY` para preço real (ou deixe `fake` para testar).

```bash
docker compose up -d --build
curl http://localhost:3000/health     # status + se o preço é real

# opcional: interface web em http://localhost:5173
cd ../../frontend/code && echo "VITE_API_KEY=<sua API_KEY>" > .env.local && pnpm install && pnpm dev
```

O banco é criado automaticamente: as **migrations rodam no boot** da API (`migrationsRun: true`),
então um clone novo não precisa de passo manual.

### 1. Criar o bot no Telegram

1. Fale com o [@BotFather](https://t.me/BotFather) e envie `/newbot`.
2. Escolha nome e username; ele devolve o token → `TELEGRAM_BOT_TOKEN`.
3. **Envie uma mensagem qualquer para o bot** (`oi`). O Telegram não permite que um bot
   inicie conversa: só é possível enviar mensagem para quem já falou com ele.
4. Descubra o seu `chat_id` com o token em mãos:

```bash
curl "https://api.telegram.org/bot<SEU_TOKEN>/getUpdates"
# procure por "chat": { "id": 123456789, ... } → esse número é o TELEGRAM_CHAT_ID
```

> Alternativa: mande `/start` para o [@userinfobot](https://t.me/userinfobot), ele responde com o seu ID.

### 2. Provar que o aviso chega (não pule)

```bash
curl -X POST http://localhost:3000/notifications/test \
  -H "Authorization: Bearer <sua API_KEY>"
```

O jeito mais silencioso de este sistema falhar é "está tudo verde e ninguém recebe nada" (chat_id
errado, bot bloqueado). Este comando manda uma mensagem de teste para o chat configurado.

### 3. Rodando sem Docker (opcional)

Requer Node >= 20.12 (o `.env` é carregado via `process.loadEnvFile`).

```bash
cd backend/code
pnpm install
pnpm start:dev
```

Nesse modo o `.env` de `backend/code/` é carregado automaticamente, mas é preciso definir `DATABASE_URL`
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
| `API_KEY` | ✅ | chave de acesso da API (mín. 16 caracteres). Sem ela a API **não sobe** |
| `PRICE_PROVIDER` | — | `fake` (padrão) ou `serpapi` |
| `SERPAPI_KEY` | com `serpapi` | chave do [SerpApi](https://serpapi.com) (Google Flights); aceita várias separadas por vírgula (round robin) |
| `CHECK_INTERVAL_MINUTES` | — | intervalo do vigia, em minutos (padrão `720`; mínimo `15`) |
| `WATCH_ENABLED` | — | `false` desliga o vigia automático |
| `PORT` | — | porta da API (padrão `3000`) |
| `CORS_ORIGIN` | — | origem(ns) liberada(s) para o frontend, separadas por vírgula (padrão `http://localhost:5173`) |
| `VITE_API_URL` | — | (frontend) URL pública da API; vazio em dev por causa do proxy |
| `VITE_API_KEY` | — | (frontend) a mesma `API_KEY` do backend |

Sem as obrigatórias a API **não sobe** e diz exatamente o que falta (`backend/code/src/config/env.ts`).
`API_KEY` curta ou igual à do exemplo também é recusada.

## Endpoints

Todos os endpoints de `/alerts`, `/watch` e `/notifications` exigem
`Authorization: Bearer <API_KEY>` (ou o header `x-api-key`). `/health` e `/airports` são públicos.

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/health` | status (banco) + se o preço é real + config faltando |
| `POST` | `/alerts` | cria **o** alerta (`409` se já existe um) |
| `GET` | `/alerts` | `{ alert }` — o alerta único, ou `null` |
| `GET` | `/alerts/:id` | detalhe do alerta |
| `PATCH` | `/alerts/:id` | muda `targetPrice` e/ou `active` (pausar/retomar) |
| `DELETE` | `/alerts/:id` | remove o alerta e o histórico dele (`204`) |
| `POST` | `/alerts/:id/check` | consulta o preço agora, grava histórico e notifica (`409` se pausado) |
| `GET` | `/alerts/:id/prices` | histórico de checagens (últimas 50) |
| `GET` | `/watch/status` | estado do vigia automático |
| `POST` | `/watch/run` | força um ciclo de checagem agora |
| `POST` | `/notifications/test` | manda uma mensagem de teste para o Telegram |
| `GET` | `/airports` | aeroportos brasileiros; `?q=gru` filtra no servidor |

Preços saem como **número** no JSON, embora o Postgres guarde `numeric`. Trocar o alvo zera o estado
de notificação, então o primeiro preço dentro da faixa do alvo novo sempre avisa.

Sem oferta na consulta, a checagem é gravada com `found: false` e preço `null` — **nunca** como zero,
e nunca gera aviso.

```bash
K=e3b0c44298fc1c149afbf4c8996fb924  # sua API_KEY

# criar alerta: GRU→SDU, ida 01/12 e volta 08/12
curl -X POST http://localhost:3000/alerts \
  -H "Authorization: Bearer $K" -H 'Content-Type: application/json' \
  -d '{"origin":"GRU","destination":"SDU","departureDate":"2026-12-01","returnDate":"2026-12-08","targetPrice":450}'

# ver o alerta
curl -H "Authorization: Bearer $K" http://localhost:3000/alerts

# mudar o alvo
curl -X PATCH http://localhost:3000/alerts/<id> \
  -H "Authorization: Bearer $K" -H 'Content-Type: application/json' -d '{"targetPrice":400}'

# pausar (o vigia não checa enquanto pausado)
curl -X PATCH http://localhost:3000/alerts/<id> \
  -H "Authorization: Bearer $K" -H 'Content-Type: application/json' -d '{"active":false}'

# checar preço agora
curl -X POST -H "Authorization: Bearer $K" http://localhost:3000/alerts/<id>/check

# forçar um ciclo do vigia
curl -X POST -H "Authorization: Bearer $K" http://localhost:3000/watch/run

# remover
curl -X DELETE -H "Authorization: Bearer $K" http://localhost:3000/alerts/<id>
```

## Frontend

`frontend/` é a interface em React 19 + Vite 7 + TypeScript. O visual usa Tailwind CSS 4 com o tema
`valentine` do daisyUI 5 (rosa pastel), ícones do lucide-react e a fonte Quicksand — tudo instalado
localmente, sem CDN. O estado vem de um único hook (`useAlerts`), porque existe um alerta só.

Para trocar a paleta, muda-se a lista `themes` em `frontend/code/src/index.css` (por exemplo `cupcake`) e o
`data-theme` do `<html>` em `frontend/code/index.html`.

```bash
cd frontend/code
echo "VITE_API_KEY=<sua API_KEY>" > .env.local
pnpm install
pnpm dev        # http://localhost:5173, com proxy de /alerts para localhost:3000
pnpm build      # typecheck (tsc --noEmit) + build de produção em dist/
```

Na tela dá para criar o alerta (origem, destino, ida, volta e valor), ver o estado do vigia, ver alvo / último
aviso / última checagem, checar na hora, pausar, retomar, editar o alvo, abrir o link do Google
Flights, ver o histórico e excluir.

O proxy do Vite aponta para `localhost:3000`. Para outra API, defina `VITE_API_URL` no build e libere
a origem do frontend em `CORS_ORIGIN`.

## Aeroportos

A lista vem de um arquivo gerado, não de uma API de terceiros em tempo de execução: o Google
Flights (via SerpApi) só **aceita** códigos, não devolve a lista. A base é a do
[OurAirports](https://ourairports.com/data/) (domínio público, atualizada toda semana), filtrada por
`iso_country=BR`, `iata_code` preenchido e `scheduled_service=yes` — 129 aeroportos hoje.

- `backend/code/src/airports/airports.data.ts` é o arquivo gerado (não edite à mão);
- `backend/code/scripts/generate-airports.mjs` baixa o CSV e reescreve o arquivo
  (`node scripts/generate-airports.mjs` dentro de `backend/code/`, ou passe um CSV já baixado como argumento);
- `GET /airports` devolve a lista inteira (o frontend cacheia) e `GET /airports?q=` busca por IATA,
  cidade ou nome oficial, sem acento e sem caixa. Cada item traz `iata`, `city`, `name` e `state`.

A lista serve só para a sugestão na tela: a API aceita qualquer código IATA de 3 letras, então um
alerta com aeroporto fora da base (por exemplo `LIS`) continua valendo e aparece apenas com o código,
sem UF.

## Estrutura

```
backend/code/                  # configurações do backend (Dockerfile, package.json, docker-compose.yml, .env...)
└── src/                       # o código da API
    ├── alerts/                # entidade, DTOs, controllers, service, vigia, avaliação e política de notificação
    ├── airports/              # lista de aeroportos brasileiros (dado gerado) + busca
    ├── common/                # datas com fuso explícito + guard da API key
    ├── prices/                # PriceProvider (interface + token de DI), SerpApi e Fake
    ├── notifications/         # TelegramService + /notifications/test
    ├── database/              # data-source e migrations
    ├── config/                # carregamento e validação do ambiente
    └── health.controller.ts

frontend/code/                 # configurações do frontend (package.json, vite.config.ts, index.html...)
└── src/                       # o código da tela
    ├── api.ts                 # cliente HTTP (fetch) da API, com a API key
    ├── index.css              # Tailwind CSS 4 + tema valentine (daisyUI) + ajustes de base
    ├── types.ts               # contratos espelhando o backend
    ├── format.ts              # moeda, datas (fuso local) e parsing de preço em pt-BR
    ├── hooks/                 # useAlerts (o alerta + mutações), useWatchStatus, useAirports
    ├── components/            # AlertForm, AirportField, AlertList, AlertCard, WatchBanner, PriceHistory
    └── App.tsx                # composição da página
```

## Decisões de arquitetura

- **Um alerta por instância**: a cota do provedor não paga N alertas. A regra é garantida no banco
  (índice único em `alerts.singleton`), então duas requisições simultâneas não criam dois.
- **Duas requisições de ida-e-volta custariam duas buscas; aqui é uma**: no engine
  `google_flights`, `type=1` + `outbound_date` + `return_date` já devolve o preço **total** do
  itinerário. O `departure_token` só é necessário para escolher os segmentos de volta.
- **Provedor plugável**: `PRICE_PROVIDER` é um token de DI; trocar SerpApi por outra fonte não mexe
  no resto do código.
- **Sem provedor configurado o sistema avisa em três lugares**: no aviso ("preço SIMULADO"), no
  `/health` (`priceProviderReal`) e no log do vigia.
- **Migrations versionadas** (nunca `synchronize: true`), executadas no boot.
- **Falha rápida na configuração** em vez de subir sem token (ou sem API key) e só avisar depois.
- **Data pura (`AAAA-MM-DD`) + fuso explícito**: `toISOString()` devolve UTC e faria "hoje" virar
  amanhã entre 21h e 00h em Brasília.

## Deploy

Ainda não há hospedagem configurada: o sistema roda localmente com o Docker Compose (veja o
Quick start). A API é sem estado e o banco pode ser qualquer Postgres, então ela pode ir para
qualquer serviço que aceite Docker.

Para o frontend: `cd frontend/code && pnpm build` gera a pasta `frontend/code/dist` (arquivos estáticos).
Defina `VITE_API_URL` e `VITE_API_KEY` no build.

```bash
# imagem de produção na mão
docker build --target prod -t tripalert-api ./backend/code
docker run --env-file backend/code/.env -p 3000:3000 tripalert-api
```

O `docker-compose.yml` usa o target `dev` (watch mode) para o desenvolvimento local.

## Testes

```bash
cd backend/code
pnpm test      # unitários (100 testes)
pnpm lint
# e2e: sobe o AppModule de verdade, então exige um Postgres acessível
DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco pnpm test:e2e

cd ../../frontend/code
pnpm build     # typecheck + build do frontend
```

## Roadmap

- [x] Fase 0 — repositório reprodutível: migrations no boot, validação de env, Docker de produção, logs úteis, README
- [x] Passo 1 — anti-repetição: aviso a cada mudança de preço dentro da faixa (valor idêntico não repete)
- [x] Fase 1 — **o sistema funciona sozinho**:
  - [x] `GET /health` no lugar do "Hello World"; README do Nest removido; resto do starter fora
  - [x] fuso horário corrigido (data pura, "hoje" de Brasília)
  - [x] provedor real (SerpApi · Google Flights) atrás de `PRICE_PROVIDER`
  - [x] data de ida e data de volta exatas (janela aposentada do banco)
  - [x] vigia automático sem sobreposição, com falha isolada, backoff e desativação de voo passado
  - [x] `API_KEY` protegendo a API
  - [x] `POST /notifications/test` (prova de entrega no Telegram)
  - [x] um alerta por vez, garantido por índice único
  - [x] aviso com as datas encontradas, companhia e link para conferir
- [ ] Passo 2 — e-mail como segundo canal de aviso
- [ ] Passo 4 — `departure_token` para escolher segmentos de volta (hoje o preço é o do melhor itinerário)
- [ ] Passo 7 — hospedagem em produção (a escolher)
