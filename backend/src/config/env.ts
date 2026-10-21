import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Procuramos o .env tanto rodando da raiz do repositório quanto de backend/.
 * No Docker o arquivo não existe: as variáveis chegam pelo docker-compose.
 */
const CANDIDATOS = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
];

export const VARIAVEIS_OBRIGATORIAS = [
  'DATABASE_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
] as const;

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
}
