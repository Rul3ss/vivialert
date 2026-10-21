import { Injectable, Logger } from '@nestjs/common';

type RespostaFetch = Awaited<ReturnType<typeof fetch>>;

interface RespostaTelegram {
  ok: boolean;
  description?: string;
  parameters?: { retry_after?: number };
}

const MAX_TENTATIVAS = 3;
const ESPERA_MAXIMA_MS = 30_000;

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  async send(
    text: string,
    chatId = process.env.TELEGRAM_CHAT_ID,
  ): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || !chatId) {
      this.logger.warn('Telegram não configurado; mensagem não enviada.');
      return false;
    }

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true,
            }),
          },
        );

        const body = await this.lerResposta(response);

        if (response.ok) {
          return true;
        }

        if (response.status === 429 && tentativa < MAX_TENTATIVAS) {
          const espera = Math.min(
            (body?.parameters?.retry_after ?? 1) * 1000,
            ESPERA_MAXIMA_MS,
          );
          this.logger.warn(
            `Telegram pediu para aguardar ${espera}ms ` +
              `(tentativa ${tentativa} de ${MAX_TENTATIVAS}).`,
          );
          await this.esperar(espera);
          continue;
        }

        this.logger.error(
          `Telegram respondeu ${response.status}: ` +
            `${body?.description ?? 'sem descrição'}`,
        );
        return false;
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        this.logger.error(`Falha ao falar com o Telegram: ${motivo}`);
        return false;
      }
    }

    return false;
  }

  private async lerResposta(
    response: RespostaFetch,
  ): Promise<RespostaTelegram | undefined> {
    try {
      return (await response.json()) as RespostaTelegram;
    } catch {
      return undefined;
    }
  }

  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
