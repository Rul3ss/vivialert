/**
 * Teste do aviso no Telegram sem subir API nem banco.
 *
 * Usa o MESMO `montarMensagem` que o sistema usa de verdade, então o que chega
 * no chatbot é idêntico ao aviso real de oferta. Lê o `.env` da raiz.
 *
 * Uso (na raiz do repositório):
 *   node backend/scripts/enviar-teste-telegram.mjs
 *   node backend/scripts/enviar-teste-telegram.mjs --simulado   # marca "SIMULADO"
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function lerEnv() {
  const env = {};
  try {
    for (const linha of readFileSync(resolve(raiz, '.env'), 'utf8').split(/\r?\n/)) {
      const casado = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(linha);
      if (casado) env[casado[1]] = casado[2].trim();
    }
  } catch {
    // sem .env: seguimos com process.env
  }
  return { ...env, ...process.env };
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (iso) => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

/** Soma dias a uma data pura, sem passar pelo fuso. */
function somarDias(iso, dias) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const c = new Date(Date.UTC(ano, mes - 1, dia));
  c.setUTCDate(c.getUTCDate() + dias);
  return c.toISOString().slice(0, 10);
}

const env = lerEnv();
const simulado = process.argv.includes('--simulado');

if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
  console.error(
    'Faltam TELEGRAM_BOT_TOKEN e/ou TELEGRAM_CHAT_ID no .env da raiz.',
  );
  process.exit(1);
}

// Sair daqui a 45 dias, ficar 7 dias — mesmas regras do alerta real.
const hoje = new Date().toISOString().slice(0, 10);
const ida = somarDias(hoje, 45);
const volta = somarDias(ida, 7);

const texto = [
  '✈️ Oferta abaixo do alvo!',
  'GRU → SSA',
  `Ida ${data(ida)} · Volta ${data(volta)}`,
  'Companhia: GOL',
  '',
  `Total por pessoa: ${moeda.format(1549.9)} (alvo: ${moeda.format(1600)})`,
  simulado
    ? '⚠️ Preço SIMULADO — configure a API real antes de confiar neste aviso.'
    : null,
  simulado
    ? null
    : '\nConferir e comprar: https://www.google.com/travel/flights?q=GRU+SSA',
  '\nEste é uma MENSAGEM DE TESTE enviada pelo script do ViviAlert.',
  '\nConfira se o preço continua igual: passagem aérea muda rápido.',
]
  .filter((linha) => linha !== null)
  .join('\n');

const resposta = await fetch(
  `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: texto,
      disable_web_page_preview: true,
    }),
  },
);

const corpo = await resposta.json().catch(() => ({}));

if (resposta.ok) {
  console.log('✅ Mensagem enviada para o chat', env.TELEGRAM_CHAT_ID);
  console.log('   Confira no Telegram agora.\n');
  console.log('--- o que foi enviado ---\n' + texto);
} else {
  console.error(
    `❌ Telegram recusou (HTTP ${resposta.status}): ${corpo.description ?? 'sem descrição'}`,
  );
  if (corpo.description?.includes('chat not found')) {
    console.error(
      '   Dica: o TELEGRAM_CHAT_ID precisa ser o de QUEM RECEBE, e essa pessoa ' +
        'precisa ter enviado uma mensagem para o bot antes.',
    );
  }
  process.exit(1);
}
