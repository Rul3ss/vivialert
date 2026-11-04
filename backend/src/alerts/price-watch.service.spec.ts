import { Repository } from 'typeorm';
import { Alert } from '../alerts/alert.entity';
import { AlertsService } from '../alerts/alerts.service';
import { PriceWatchService } from './price-watch.service';
import { hoje, somarDias } from '../common/date';

function criarAlerta(ajustes: Partial<Alert> = {}): Alert {
  return {
    id: 'a1',
    singleton: true,
    origin: 'GRU',
    destination: 'SDU',
    departureDate: somarDias(hoje(), 10),
    returnDate: somarDias(hoje(), 17),
    targetPrice: '450.00',
    active: true,
    lastNotifiedPrice: null,
    lastNotifiedLevel: null,
    lastNotifiedAt: null,
    lastCheckedAt: null,
    lastError: null,
    consecutiveFailures: 0,
    createdAt: new Date(),
    ...ajustes,
  };
}

describe('PriceWatchService', () => {
  const envOriginal = { ...process.env };
  let alertas: { find: jest.Mock; save: jest.Mock };
  let alertsService: { executarChecagem: jest.Mock };
  let watch: PriceWatchService;

  beforeEach(() => {
    alertas = {
      find: jest.fn(async () => [criarAlerta()]),
      save: jest.fn(async (a: Alert) => a),
    };
    alertsService = {
      executarChecagem: jest.fn(async () => ({ notified: false })),
    };
    watch = new PriceWatchService(
      alertas as unknown as Repository<Alert>,
      alertsService as unknown as AlertsService,
    );
    process.env.WATCH_ENABLED = 'false'; // não inicia o timer nos testes
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('checa o alerta ativo sem ninguém clicar', async () => {
    const checados = await watch.rodarCiclo();

    expect(checados).toBe(1);
    expect(alertsService.executarChecagem).toHaveBeenCalledTimes(1);
  });

  it('nunca roda dois ciclos ao mesmo tempo', async () => {
    let liberar: () => void = () => {};
    alertsService.executarChecagem.mockImplementation(
      () => new Promise<void>((resolve) => (liberar = resolve)),
    );

    const primeiro = watch.rodarCiclo();
    const segundo = await watch.rodarCiclo();

    expect(segundo).toBeNull();
    liberar();
    await primeiro;
  });

  it('desativa alerta cuja data de ida já passou', async () => {
    alertas.find.mockResolvedValue([
      criarAlerta({
        departureDate: somarDias(hoje(), -10),
        returnDate: somarDias(hoje(), -3),
      }),
    ]);

    await watch.rodarCiclo();

    expect(alertsService.executarChecagem).not.toHaveBeenCalled();
    const salvo = alertas.save.mock.calls[0][0] as Alert;
    expect(salvo.active).toBe(false);
  });

  it('mantém ativo quando a ida ainda não passou', async () => {
    alertas.find.mockResolvedValue([
      criarAlerta({
        departureDate: hoje(), // ida hoje ainda não passou
        returnDate: somarDias(hoje(), 3),
      }),
    ]);

    await watch.rodarCiclo();

    expect(alertsService.executarChecagem).toHaveBeenCalledTimes(1);
  });

  it('pula o alerta quando o backoff manda esperar', async () => {
    alertas.find.mockResolvedValue([criarAlerta({ consecutiveFailures: 3 })]);

    await watch.rodarCiclo();

    expect(alertsService.executarChecagem).not.toHaveBeenCalled();
  });

  it('tenta de novo nos ciclos de backoff (1, 2, 4, 8, 16)', async () => {
    for (const falhas of [1, 2, 4, 8, 16]) {
      alertas.find.mockResolvedValue([
        criarAlerta({ consecutiveFailures: falhas }),
      ]);
      alertsService.executarChecagem.mockClear();

      await watch.rodarCiclo();

      expect(alertsService.executarChecagem).toHaveBeenCalledTimes(1);
    }
  });

  it('não derruba o ciclo quando a checagem de um alerta falha', async () => {
    alertsService.executarChecagem.mockRejectedValue(new Error('boom'));

    const checados = await watch.rodarCiclo();

    expect(checados).toBe(0);
    // e um próximo ciclo continua funcionando
    alertsService.executarChecagem.mockResolvedValue({ notified: false });
    await expect(watch.rodarCiclo()).resolves.toBe(1);
  });

  it('status informa intervalo e se está ligado', () => {
    const status = watch.status();

    expect(status.enabled).toBe(false);
    expect(status.intervalMinutes).toBe(720);
    expect(status.running).toBe(false);
  });

  it('usa CHECK_INTERVAL_MINUTES quando válido e ignora valor absurdo', () => {
    process.env.CHECK_INTERVAL_MINUTES = '240';
    expect(watch.intervaloBase).toBe(240);

    process.env.CHECK_INTERVAL_MINUTES = '1';
    expect(watch.intervaloBase).toBe(720);
  });
});
