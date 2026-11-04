import type { PriceResult } from './types';

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export const ROTULO_RESULTADO: Record<PriceResult, string> = {
  OFFER: 'Oferta',
  NEAR_TARGET: 'Perto do alvo',
  ABOVE_TARGET: 'Acima do alvo',
};

export function formatarPreco(valor: number): string {
  return MOEDA.format(valor);
}

/** '2026-12-01' (data pura) → '01/12/2026', sem risco de virar o dia pelo fuso. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) {
    return iso;
  }
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return DATA_HORA.format(new Date(iso));
}

/**
 * Soma dias a uma data pura. Usa UTC só como calendário neutro: `new Date(iso)`
 * trataria a string como UTC e poderia deslocar o dia pelo fuso local.
 */
export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const calendario = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1));
  calendario.setUTCDate(calendario.getUTCDate() + dias);
  return calendario.toISOString().slice(0, 10);
}

/** `AAAA-MM-DD` de **hoje no fuso local** (o `toISOString` daria o dia em UTC). */
export function hoje(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Dias inteiros de `de` até `ate` (negativo se `ate` vem antes). */
export function diferencaEmDias(de: string, ate: string): number {
  const inicio = new Date(`${de}T00:00:00`).getTime();
  const fim = new Date(`${ate}T00:00:00`).getTime();
  return Math.round((fim - inicio) / 86_400_000);
}

/** Dias inteiros até a data (negativo se já passou). */
export function diasAte(iso: string): number {
  return diferencaEmDias(hoje(), iso);
}

export function rotuloContagem(dias: number): string {
  if (dias === 0) {
    return 'hoje';
  }
  if (dias === 1) {
    return 'amanhã';
  }
  if (dias < 0) {
    return `há ${Math.abs(dias)} dias`;
  }
  return `em ${dias} dias`;
}

/** `valor` vindo de um input type=number/text: aceita "1.500,50" e "1500.50". */
export function parsearPreco(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.');
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

export function mensagemDeErro(causa: unknown): string {
  return causa instanceof Error ? causa.message : 'Erro inesperado.';
}
