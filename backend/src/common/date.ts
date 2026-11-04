/**
 * Trabalhamos sempre com data pura (`AAAA-MM-DD`) no fuso do viajante.
 *
 * `new Date().toISOString().slice(0, 10)` devolve a data em UTC: entre 21h e
 * 00h no horário de Brasília, o "hoje" do servidor já é o dia seguinte e um
 * voo para amanhã era recusado como "no passado". Aqui o fuso é explícito.
 *
 * Formato de data do tipo `AAAA-MM-DD` também evita que o dia mude por causa
 * de fuso ao converter para `Date` — por isso nunca usamos `new Date(iso)`.
 */
export const TIME_ZONE_OFICIAL = 'America/Sao_Paulo';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** `AAAA-MM-DD` de um instante qualquer, no fuso informado. */
export function dataNoFuso(agora: Date, timeZone: string): string {
  // `en-CA` formata como AAAA-MM-DD, que é exatamente o formato que queremos.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** `AAAA-MM-DD` de hoje no fuso do viajante. */
export function hoje(timeZone = TIME_ZONE_OFICIAL, agora = new Date()): string {
  return dataNoFuso(agora, timeZone);
}

/**
 * Soma (ou subtrai) dias a uma data pura. Usa UTC só como calendário neutro,
 * então não há fuso no meio do caminho.
 */
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const calendar = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1));
  calendar.setUTCDate(calendar.getUTCDate() + dias);
  return calendar.toISOString().slice(0, 10);
}

/** Quantos dias corridos há de `de` até `ate` (negativo se `ate` já passou). */
export function diferencaEmDias(de: string, ate: string): number {
  const [anoDe, mesDe, diaDe] = de.split('-').map(Number);
  const [anoAte, mesAte, diaAte] = ate.split('-').map(Number);
  const inicio = Date.UTC(anoDe ?? 0, (mesDe ?? 1) - 1, diaDe ?? 1);
  const fim = Date.UTC(anoAte ?? 0, (mesAte ?? 1) - 1, diaAte ?? 1);
  return Math.round((fim - inicio) / 86_400_000);
}

export function isDataPura(valor: string): boolean {
  if (!FORMATO_DATA.test(valor)) return false;
  // 2026-02-31 passa no regex, por isso conferimos o round-trip.
  return somarDias(valor, 0) === valor;
}

/**
 * Lista todos os dias entre `inicio` e `fim`, inclusive. Limite alto porque a
 * janela vem validada (ver `MAX_DIAS_JANELA` no DTO).
 */
export function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  for (let atual = inicio; atual <= fim; atual = somarDias(atual, 1)) {
    dias.push(atual);
  }
  return dias;
}
