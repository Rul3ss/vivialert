FROM node:24.19.0-alpine AS base

ARG PNPM_VERSION=11.21.0
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- desenvolvimento (usado pelo docker-compose, com hot reload) ----------
FROM base AS dev

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]

# ---------- build ----------
FROM base AS build

COPY . .

RUN pnpm run build

# ---------- produção (imagem final enxuta, só runtime) ----------
FROM node:24.19.0-alpine AS prod

ARG PNPM_VERSION=11.21.0
RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
