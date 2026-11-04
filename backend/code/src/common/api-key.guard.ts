import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/**
 * Chave única de acesso à API. Para uma pessoa só, isso é mais barato e
 * igualmente seguro do que sessão/OAuth.
 *
 * A comparação é em tempo constante para não vazar a chave por diferença de
 * tempo de resposta. Se `API_KEY` não estiver definida, a API **não sobe**
 * (ver `validateEnv`): esquecer a configuração nunca deixa a porta aberta.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(contexto: ExecutionContext): boolean {
    const esperada = process.env.API_KEY?.trim();
    if (!esperada) {
      // Sem chave configurada o boot já falhou; aqui é só a rede de segurança.
      throw new UnauthorizedException('API_KEY não configurada.');
    }

    const requisicao = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const recebida = lerChave(requisicao.headers);

    if (!recebida || !compararEmTempoConstante(recebida, esperada)) {
      this.logger.warn('Requisição com chave de API ausente ou inválida.');
      throw new UnauthorizedException('Chave de API inválida.');
    }

    return true;
  }
}

/** Aceita `Authorization: Bearer <chave>` e também o header `x-api-key`. */
function lerChave(headers: Record<string, string | undefined>): string | null {
  const autorizacao = headers.authorization;
  if (autorizacao?.toLowerCase().startsWith('bearer ')) {
    return autorizacao.slice('bearer '.length).trim();
  }
  const direta = headers['x-api-key'];
  return direta?.trim() ?? null;
}

function compararEmTempoConstante(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    // Comprimentos diferentes não são um vazamento relevante aqui, mas ainda
    // comparamos algo para manter o tempo de resposta estável.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
