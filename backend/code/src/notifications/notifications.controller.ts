import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ApiKeyGuard } from '../common/api-key.guard';
import { hoje } from '../common/date';

/**
 * Prova, de ponta a ponta, que o aviso chega no Telegram.
 *
 * O jeito mais silencioso de este sistema falhar é "estar tudo verde e ela
 * nunca receber nada" (chat_id errado, bot bloqueado, bot sem conversa aberta).
 * Rodar este endpoint uma vez antes de confiar no vigia resolve isso.
 */
@Controller('notifications')
@UseGuards(ApiKeyGuard)
export class NotificationsController {
  constructor(private readonly telegram: TelegramService) {}

  @Post('test')
  @HttpCode(200)
  async test() {
    const enviado = await this.telegram.send(
      `✅ Teste do ViviAlert (${hoje()}).\n` +
        'Se você está lendo isso, o aviso de passagem vai chegar aqui.',
    );

    if (!enviado) {
      return {
        enviado: false,
        mensagem:
          'O Telegram recusou ou não está configurado. Confira TELEGRAM_BOT_TOKEN, ' +
          'se TELEGRAM_CHAT_ID é o seu chat e se você já enviou uma mensagem para o bot.',
      };
    }
    return { enviado: true, mensagem: 'Mensagem enviada. Confira o Telegram.' };
  }
}
