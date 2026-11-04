import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { PRICE_PROVIDER } from '../prices/price-provider.interface';
import type { PriceProvider } from '../prices/price-provider.interface';
import { PriceCheck } from './price-check.entity';
import { evaluatePrice } from './price-evaluation';
import type { PriceResult } from './price-evaluation';
import { shouldNotify } from './notification-policy';
import { TelegramService } from '../notifications/telegram.service';
import { montarMensagem } from './notification-message';
import { hoje } from '../common/date';

/**
 * O `numeric` do Postgres chega como string no TypeORM. Convertemos na borda
 * para o frontend nunca precisar lembrar disso.
 */
export interface AlertResponse {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  targetPrice: number;
  active: boolean;
  lastNotifiedPrice: number | null;
  lastNotifiedLevel: PriceResult | null;
  lastNotifiedAt: Date | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  createdAt: Date;
}

export interface PriceCheckResponse {
  id: string;
  price: number | null;
  currency: string;
  departureDate: string | null;
  returnDate: string | null;
  airline: string | null;
  source: string | null;
  found: boolean;
  checkedAt: Date;
}

export interface CheckOutcome {
  alert: AlertResponse;
  priceCheck: PriceCheckResponse;
  result: PriceResult | null;
  notified: boolean;
}

/** Código do Postgres para violação de índice único. */
const UNIQUE_VIOLATION = '23505';

function toAlertResponse(alert: Alert): AlertResponse {
  return {
    id: alert.id,
    origin: alert.origin,
    destination: alert.destination,
    departureDate: alert.departureDate,
    returnDate: alert.returnDate,
    targetPrice: Number(alert.targetPrice),
    active: alert.active,
    lastNotifiedPrice:
      alert.lastNotifiedPrice === null ? null : Number(alert.lastNotifiedPrice),
    lastNotifiedLevel: alert.lastNotifiedLevel,
    lastNotifiedAt: alert.lastNotifiedAt,
    lastCheckedAt: alert.lastCheckedAt,
    lastError: alert.lastError,
    consecutiveFailures: alert.consecutiveFailures,
    createdAt: alert.createdAt,
  };
}

function toPriceCheckResponse(check: PriceCheck): PriceCheckResponse {
  return {
    id: check.id,
    price: check.found ? Number(check.price) : null,
    currency: check.currency,
    departureDate: check.departureDate,
    returnDate: check.returnDate,
    airline: check.airline,
    source: check.source,
    found: check.found,
    checkedAt: check.checkedAt,
  };
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alerts: Repository<Alert>,
    @InjectRepository(PriceCheck)
    private readonly priceChecks: Repository<PriceCheck>,
    @Inject(PRICE_PROVIDER)
    private readonly priceProvider: PriceProvider,
    private readonly telegram: TelegramService,
  ) {}

  // -------------------------------------------------------------------------
  // CRUD (existe no máximo 1 alerta)
  // -------------------------------------------------------------------------

  async create(dto: CreateAlertDto) {
    this.validarDatas(dto);

    const existente = await this.buscarUnico();
    if (existente) {
      throw new ConflictException(
        'Já existe um alerta. O sistema trabalha com um alerta por vez: edite ou exclua o atual.',
      );
    }

    const alert = this.alerts.create({
      singleton: true,
      origin: dto.origin.toUpperCase(),
      destination: dto.destination.toUpperCase(),
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      targetPrice: dto.targetPrice.toFixed(2),
    });

    try {
      return toAlertResponse(await this.alerts.save(alert));
    } catch (erro) {
      // Duas requisições simultâneas: o índice único segura a segunda.
      if (
        erro instanceof QueryFailedError &&
        (erro.driverError as { code?: string } | undefined)?.code ===
          UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'Já existe um alerta. O sistema trabalha com um alerta por vez: edite ou exclua o atual.',
        );
      }
      throw erro;
    }
  }

  /** O alerta único, ou `null` se ainda não existe. */
  async buscarUnico(): Promise<AlertResponse | null> {
    const alert = await this.alerts.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });
    return alert ? toAlertResponse(alert) : null;
  }

  async findOne(id: string) {
    const alert = await this.alerts.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }
    return toAlertResponse(alert);
  }

  async update(id: string, dto: UpdateAlertDto) {
    if (dto.targetPrice === undefined && dto.active === undefined) {
      throw new BadRequestException('Informe targetPrice ou active.');
    }

    const alert = await this.alerts.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }

    if (
      dto.targetPrice !== undefined &&
      dto.targetPrice !== Number(alert.targetPrice)
    ) {
      alert.targetPrice = dto.targetPrice.toFixed(2);
      // Alvo novo, avisos novos: sem isso o estado do alvo anterior
      // continuaria segurando a primeira notificação do novo alvo.
      alert.lastNotifiedPrice = null;
      alert.lastNotifiedLevel = null;
      alert.lastNotifiedAt = null;
    }
    if (dto.active !== undefined) {
      alert.active = dto.active;
      if (dto.active) {
        // Retomar é uma tentativa nova: não arrastamos erros antigos.
        alert.consecutiveFailures = 0;
      }
    }

    return toAlertResponse(await this.alerts.save(alert));
  }

  async remove(id: string) {
    const alert = await this.alerts.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }
    // Os price_checks vão junto (FK com ON DELETE CASCADE).
    await this.alerts.remove(alert);
  }

  // -------------------------------------------------------------------------
  // Checagem de preço — usada pelo botão da tela E pelo vigia
  // -------------------------------------------------------------------------

  /**
   * Consulta o preço, grava o histórico e avisa se for o caso.
   *
   * Não lança por falha de rede/provedor: grava o erro no alerta e devolve o
   * resultado. Assim o vigia nunca morre por causa de uma consulta, e a tela
   * mostra o motivo em vez de um 500 opaco.
   */
  async executarChecagem(alert: Alert): Promise<CheckOutcome> {
    try {
      const cotacao = await this.priceProvider.buscarMenorPreco({
        origin: alert.origin,
        destination: alert.destination,
        departureDate: alert.departureDate,
        returnDate: alert.returnDate,
        tripType: 'round_trip',
      });

      return await this.registrarCotacao(alert, cotacao);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      this.logger.error(
        `Checagem falhou para ${alert.origin}→${alert.destination}: ${motivo}`,
      );

      alert.lastError = motivo;
      alert.consecutiveFailures += 1;
      await this.alerts.save(alert);

      const registro = await this.priceChecks.save(
        this.priceChecks.create({
          alert,
          price: '0.00',
          found: false,
          source: this.priceProvider.nome,
        }),
      );

      return {
        alert: toAlertResponse(alert),
        priceCheck: toPriceCheckResponse(registro),
        result: null,
        notified: false,
      };
    }
  }

  private async registrarCotacao(
    alert: Alert,
    cotacao: Awaited<ReturnType<PriceProvider['buscarMenorPreco']>>,
  ): Promise<CheckOutcome> {
    // Sucesso limpa o erro anterior para a tela não mostrar falha velha.
    alert.lastError = null;
    alert.consecutiveFailures = 0;
    alert.lastCheckedAt = new Date();

    // Sem oferta não é preço zero e NUNCA gera notificação.
    if (cotacao === null) {
      await this.alerts.save(alert);
      const vazio = await this.priceChecks.save(
        this.priceChecks.create({
          alert,
          price: '0.00',
          found: false,
          source: this.priceProvider.nome,
        }),
      );
      return {
        alert: toAlertResponse(alert),
        priceCheck: toPriceCheckResponse(vazio),
        result: null,
        notified: false,
      };
    }

    const check = this.priceChecks.create({
      alert,
      price: cotacao.price.toFixed(2),
      currency: cotacao.currency,
      departureDate: cotacao.departureDate,
      returnDate: cotacao.returnDate,
      airline: cotacao.airline,
      source: cotacao.source,
      found: true,
    });
    const salvo = await this.priceChecks.save(check);

    const result = evaluatePrice(cotacao.price, Number(alert.targetPrice));
    const notify = shouldNotify({
      price: cotacao.price,
      result,
      lastNotifiedPrice:
        alert.lastNotifiedPrice === null
          ? null
          : Number(alert.lastNotifiedPrice),
    });

    this.logger.log(
      `Checagem ${alert.origin}→${alert.destination}: ` +
        `R$ ${cotacao.price.toFixed(2)} (${result})` +
        (notify ? ' → avisando' : ''),
    );

    let notified = false;
    if (notify) {
      const enviado = await this.telegram.send(
        montarMensagem({
          result,
          price: cotacao.price,
          targetPrice: Number(alert.targetPrice),
          origin: alert.origin,
          destination: alert.destination,
          // As datas vêm do alerta, não da cotação: elas são fixas e assim a
          // mensagem nunca repete a ida por causa de um provedor descuidado.
          departureDate: alert.departureDate,
          returnDate: alert.returnDate,
          airline: cotacao.airline,
          sourceUrl: cotacao.sourceUrl,
          simulated: cotacao.source === 'fake',
        }),
      );

      // Só marcamos o aviso depois que ele saiu: se o Telegram falhar,
      // a próxima checagem tenta avisar de novo em vez de perder a oferta.
      if (enviado) {
        notified = true;
        alert.lastNotifiedPrice = cotacao.price.toFixed(2);
        alert.lastNotifiedLevel = result;
        alert.lastNotifiedAt = new Date();
      } else {
        alert.lastError = 'Não foi possível enviar o aviso no Telegram.';
        alert.consecutiveFailures += 1;
      }
    }

    await this.alerts.save(alert);

    return {
      alert: toAlertResponse(alert),
      priceCheck: toPriceCheckResponse(salvo),
      result,
      notified,
    };
  }

  /** Botão "Checar preço" da tela: recusa alerta pausado (o vigia não). */
  async checkPrice(id: string): Promise<CheckOutcome> {
    const alert = await this.alerts.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }

    if (!alert.active) {
      throw new ConflictException(
        'Alerta pausado. Retome para checar.',
      );
    }

    return this.executarChecagem(alert);
  }

  async findPrices(id: string) {
    const alert = await this.alerts.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alerta não encontrado.');
    }

    const checks = await this.priceChecks.find({
      where: { alert: { id } },
      order: { checkedAt: 'DESC' },
      take: 50,
    });
    return checks.map(toPriceCheckResponse);
  }

  // -------------------------------------------------------------------------
  // Validação das datas
  // -------------------------------------------------------------------------

  private validarDatas(dto: CreateAlertDto): void {
    if (dto.origin.toUpperCase() === dto.destination.toUpperCase()) {
      throw new BadRequestException('Origem e destino precisam ser diferentes.');
    }

    if (dto.returnDate <= dto.departureDate) {
      throw new BadRequestException('A volta precisa ser depois da ida.');
    }

    if (dto.departureDate < hoje()) {
      throw new BadRequestException('A ida não pode estar no passado.');
    }
  }
}
