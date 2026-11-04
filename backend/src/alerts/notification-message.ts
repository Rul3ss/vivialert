import type { PriceResult } from './price-evaluation';

/**
 * Texto do aviso no Telegram.
 *
 * Inclui **as datas que geraram o preço** (a janela pode ter escolhido outro
 * dia), o link para conferir e o comando para pausar — a pessoa recebe a
 * mensagem e consegue agir sem abrir nada.
 */
export interface NotificationContent {
  result: PriceResult | null;
  price: number;
  targetPrice: number;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  airline: string | null;
  sourceUrl: string | null;
  simulated: boolean;
}

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dataCurta = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

export function montarMensagem(conteudo: NotificationContent): string {
  const titulo =
    conteudo.result === 'OFFER' ? '✈️ Oferta abaixo do alvo!' : '👀 Perto do alvo';

  const linhas = [
    titulo,
    `${conteudo.origin} → ${conteudo.destination}`,
    `Ida ${dataCurta(conteudo.departureDate)} · Volta ${dataCurta(conteudo.returnDate)}`,
    conteudo.airline ? `Companhia: ${conteudo.airline}` : null,
    '',
    `Total por pessoa: ${MOEDA.format(conteudo.price)} (alvo: ${MOEDA.format(conteudo.targetPrice)})`,
    conteudo.simulated
      ? '⚠️ Preço SIMULADO — configure a API real antes de confiar neste aviso.'
      : null,
    conteudo.sourceUrl ? `\nConferir e comprar: ${conteudo.sourceUrl}` : null,
    '\nConfira se o preço continua igual: passagem aérea muda rápido.',
  ];

  return linhas.filter((linha): linha is string => linha !== null).join('\n');
}
