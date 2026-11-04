import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * O .env fica em backend/code/, a pasta de onde a API roda.
 * No Docker o arquivo não existe: as variáveis chegam pelo docker-compose.
 */
const CANDIDATOS = [resolve(process.cwd(), '.env')];

export const VARIAVEIS_OBRIGATORIAS = [
  'DATABASE_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'API_KEY',
] as const;

/** Chave de exemplo do `.env.example`: aceitá-la seria o mesmo que não ter chave. */
const CHAVES_PROIBIDAS = new Set(['troque-esta-chave', 'changeme', 'change-me']);

/**
 * Carrega o .env local quando existir (Node >= 20.12).
 * Variáveis já definidas no ambiente têm prioridade e não são sobrescritas.
 */
export function loadEnvFileSafe(): void {
  const arquivo = CANDIDATOS.find((caminho) => existsSync(caminho));
  if (!arquivo) return;
  if (typeof process.loadEnvFile !== 'function') return;

  try {
    process.loadEnvFile(arquivo);
  } catch {
    // arquivo ilegível ou permissão negada: seguimos com o ambiente atual
  }
}

/**
 * Falha rápido no boot em vez de deixar o app subir e só avisar na hora de enviar.
 * Inclui `API_KEY`: subir sem chave deixaria a API aberta para qualquer um.
 */
export function validateEnv(): void {
  const faltando = VARIAVEIS_OBRIGATORIAS.filter(
    (nome) => !process.env[nome]?.trim(),
  );

  if (faltando.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${faltando.join(', ')}. ` +
        'Copie o .env.example para .env e preencha os valores.',
    );
  }

  const apiKey = process.env.API_KEY?.trim() ?? '';
  if (apiKey.length < 16 || CHAVES_PROIBIDAS.has(apiKey.toLowerCase())) {
    throw new Error(
      'API_KEY muito curta ou igual à do exemplo. Gere uma com: ' +
        "node -e \"console.log(require('crypto').randomBytes(24).toString('hex'))\"",
    );
  }
}

/** `WATCH_ENABLED=false` desliga o vigia automático (útil em testes e no CI). */
export function watchEnabled(): boolean {
  return process.env.WATCH_ENABLED?.trim().toLowerCase() !== 'false';
}
