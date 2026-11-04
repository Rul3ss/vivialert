import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../alerts/alert.entity';
import { AlertsService } from '../alerts/alerts.service';
import { diferencaEmDias, hoje } from '../common/date';

/**
 * O vigia: consulta o preço do alerta sozinho, sem ninguém clicar.
 *
 * Usa `setInterval` gerido pelo ciclo de vida do Nest em vez de
 * `@nestjs/schedule`: uma tarefa recorrente só não justifica a dependência, e
 * assim nada mais entra no `package.json`.
 *
 * Três garantias que importam:
 * 1. **Sem sobreposição**: um ciclo lento (API devagar) não inicia outro por
 *    cima; sem isso, a cota e as notificações duplicam.
 * 2. **Falha isolada**: erro na consulta é gravado no alerta e o ciclo termina
 *    normalmente — o vigia não morre nem trava.
 * 3. **Backoff**: depois de falhas seguidas, o intervalo dobra (até um teto)
 *    para não queimar cota batendo numa API fora do ar.
 */

export interface WatchStatus {
  /** Vigia automático ligado? */
  enabled: boolean;
  /** Intervalo base em minutos (env `CHECK_INTERVAL_MINUTES`). */
  intervalMinutes: number;
  /** Quando o próximo ciclo é esperado. */
  nextRunAt: Date | null;
  /** Último ciclo executado. */
  lastRunAt: Date | null;
  /** `true` enquanto um ciclo está rodando. */
  running: boolean;
}

const INTERVALO_PADRAO_MINUTOS = 720; // 2× por dia
const INTERVALO_MINIMO_MINUTOS = 15;
/** Com erro global, o vigia chega a esperar 8× o intervalo base. */
const TETO_INTERVALO_MULTIPLICADOR = 8;

@Injectable()
export class PriceWatchService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PriceWatchService.name);

  private timer: NodeJS.Timeout | null = null;
  private rodando = false;
  private proximaExecucao: Date | null = null;
  private ultimaExecucao: Date | null = null;
  private intervaloAtualMinutos = INTERVALO_PADRAO_MINUTOS;
  private desligado: Promise<void> = Promise.resolve();

  constructor(
    @InjectRepository(Alert)
    private readonly alerts: Repository<Alert>,
    private readonly alertsService: AlertsService,
  ) {}

  /** `WATCH_ENABLED=false` desliga o vigia (útil em testes e no CI). */
  get ativo(): boolean {
    return process.env.WATCH_ENABLED?.trim().toLowerCase() !== 'false';
  }

  get intervaloBase(): number {
    const bruto = Number(process.env.CHECK_INTERVAL_MINUTES);
    if (Number.isFinite(bruto) && bruto >= INTERVALO_MINIMO_MINUTOS) {
      return bruto;
    }
    return INTERVALO_PADRAO_MINUTOS;
  }

  onApplicationBootstrap(): void {
    if (!this.ativo) {
      this.logger.warn('Vigia automático DESLIGADO (WATCH_ENABLED=false).');
      return;
    }

    this.intervaloAtualMinutos = this.intervaloBase;
    this.logger.log(
      `Vigia automático ligado: um ciclo a cada ${this.intervaloBase} min.`,
    );
    // Primeira checagem pouco depois do boot, sem bloquear a subida.
    this.agendar(30_000);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.desligado;
  }

  /**
   * Roda um ciclo agora (usado pelo agendador e pode ser chamado à mão).
   * Devolve quantos alertas foram checados; `null` se outro ciclo já estava
   * em andamento (nunca roda dois ao mesmo tempo).
   */
  async rodarCiclo(): Promise<number | null> {
    if (this.rodando) {
      this.logger.warn('Ciclo já em andamento; este foi ignorado.');
      return null;
    }

    this.rodando = true;
    let falhouGlobalmente = false;
    try {
      const alertas = await this.alerts.find({ where: { active: true } });
      this.ultimaExecucao = new Date();

      for (const alerta of alertas) {
        await this.checarUm(alerta);
      }

      this.logger.log(
        `Ciclo concluído: ${alertas.length} alerta(s) ativo(s) checado(s).`,
      );
      return alertas.length;
    } catch (erro) {
      // Só chega aqui se o próprio banco falhar: nada mais derruba o ciclo.
      falhouGlobalmente = true;
      this.logger.error(
        `Ciclo do vigia falhou: ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
      return 0;
    } finally {
      this.rodando = false;
      if (falhouGlobalmente) this.aumentarIntervalo();
      else this.restaurarIntervalo();
      this.reagendar();
    }
  }

  private async checarUm(alert: Alert): Promise<void> {
    const hojeIso = hoje();

    // Voo que já partiu não tem mais preço para monitorar: desativa em vez de
    // gastar consulta à toa.
    if (diferencaEmDias(hojeIso, alert.departureDate) < 0) {
      alert.active = false;
      await this.alerts.save(alert);
      this.logger.log(
        `Alerta ${alert.origin}→${alert.destination} desativado: data de ida já passou.`,
      );
      return;
    }

    // Backoff: com N falhas seguidas, pula ciclos entre as tentativas.
    if (alert.consecutiveFailures > 0 && !this.deveTentarAgora(alert)) {
      this.logger.log(
        `Pulando ${alert.origin}→${alert.destination}: ${alert.consecutiveFailures} falha(s) seguida(s).`,
      );
      return;
    }

    await this.alertsService.executarChecagem(alert);
  }

  /**
   * Tenta quando o número de falhas é 1, 2, 4, 8 ou 16: entre uma tentativa e
   * a seguinte o intervalo dobra. Depois de 16 falhas seguidas tenta sempre
   * (uma checagem por ciclo), até alguém acertar a configuração.
   */
  private deveTentarAgora(alert: Alert): boolean {
    if (alert.consecutiveFailures > 16) return true;
    return (alert.consecutiveFailures & (alert.consecutiveFailures - 1)) === 0;
  }

  private agendar(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    if (!this.ativo) return;

    this.proximaExecucao = new Date(Date.now() + ms);
    this.timer = setTimeout(() => {
      this.desligado = this.rodarCiclo().then(() => undefined);
    }, ms);
    this.timer.unref?.();
  }

  /** Depois de cada ciclo: agenda o próximo, usando o intervalo atual. */
  private reagendar(): void {
    if (!this.ativo) return;
    this.agendar(this.intervaloAtualMinutos * 60_000);
  }

  /**
   * Dobra o intervalo até `TETO_INTERVALO_MULTIPLICADOR`× o base. Chamado
   * quando o ciclo falhou de forma global (ex.: provedor fora do ar).
   */
  private aumentarIntervalo(): void {
    const teto = this.intervaloBase * TETO_INTERVALO_MULTIPLICADOR;
    this.intervaloAtualMinutos = Math.min(this.intervaloAtualMinutos * 2, teto);
  }

  /** Volta ao intervalo base depois de um ciclo bem-sucedido. */
  private restaurarIntervalo(): void {
    this.intervaloAtualMinutos = this.intervaloBase;
  }

  status(): WatchStatus {
    return {
      enabled: this.ativo,
      intervalMinutes: this.intervaloBase,
      nextRunAt: this.proximaExecucao,
      lastRunAt: this.ultimaExecucao,
      running: this.rodando,
    };
  }
}
