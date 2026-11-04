import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import type { TelegramService } from '../notifications/telegram.service';
import type {
  PriceProvider,
  PriceQuery,
  PriceQuote,
} from '../prices/price-provider.interface';
import { Alert } from './alert.entity';
import { AlertsService } from './alerts.service';
import { PriceCheck } from './price-check.entity';
import { hoje, somarDias } from '../common/date';

type RepositorioStub = {
  create: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  remove: jest.Mock;
  save: jest.Mock;
};

function criarRepositorio<T>(): RepositorioStub {
  return {
    create: jest.fn((valor: Partial<T>) => valor),
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findOneBy: jest.fn(async () => null),
    remove: jest.fn(async (valor: T) => valor),
    save: jest.fn(async (valor: T) => valor),
  };
}

const IDA = somarDias(hoje(), 30);
const VOLTA = somarDias(IDA, 7);

function criarAlerta(ajustes: Partial<Alert> = {}): Alert {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    singleton: true,
    origin: 'GRU',
    destination: 'SDU',
    departureDate: IDA,
    returnDate: VOLTA,
    targetPrice: '5000.00',
    active: true,
    lastNotifiedPrice: '2100.00',
    lastNotifiedLevel: 'OFFER',
    lastNotifiedAt: new Date('2026-10-01T10:00:00Z'),
    lastCheckedAt: new Date('2026-10-01T10:00:00Z'),
    lastError: null,
    consecutiveFailures: 0,
    createdAt: new Date('2026-10-01T09:00:00Z'),
    ...ajustes,
  };
}

function cotacao(ajustes: Partial<PriceQuote> = {}): PriceQuote {
  return {
    price: 2000,
    currency: 'BRL',
    departureDate: IDA,
    returnDate: VOLTA,
    airline: 'GOL',
    sourceUrl: 'https://www.google.com/travel/flights?q=teste',
    source: 'fake',
    ...ajustes,
  };
}

function criarDto(ajustes: Record<string, unknown> = {}) {
  return {
    origin: 'GRU',
    destination: 'SDU',
    departureDate: IDA,
    returnDate: VOLTA,
    targetPrice: 450,
    ...ajustes,
  } as never;
}

describe('AlertsService', () => {
  let alertas: RepositorioStub;
  let precos: RepositorioStub;
  let provider: { buscarMenorPreco: jest.Mock; nome: string };
  let telegram: { send: jest.Mock };
  let service: AlertsService;

  beforeEach(() => {
    alertas = criarRepositorio<Alert>();
    precos = criarRepositorio<PriceCheck>();
    provider = {
      buscarMenorPreco: jest.fn(async () => cotacao()),
      nome: 'fake',
    };
    telegram = { send: jest.fn(async () => true) };

    service = new AlertsService(
      alertas as unknown as Repository<Alert>,
      precos as unknown as Repository<PriceCheck>,
      provider as unknown as PriceProvider,
      telegram as unknown as TelegramService,
    );
  });

  // -------------------------------------------------------------------------
  describe('create (um alerta só)', () => {
    it('cria o alerta quando não existe nenhum', async () => {
      const criado = await service.create(criarDto());

      expect(criado.origin).toBe('GRU');
      expect(criado.departureDate).toBe(IDA);
      expect(criado.returnDate).toBe(VOLTA);
      expect(alertas.save).toHaveBeenCalledTimes(1);
    });

    it('aumenta o código IATA para maiúsculas', async () => {
      await service.create(criarDto({ origin: 'gru', destination: 'sdu' }));

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.origin).toBe('GRU');
      expect(salvo.destination).toBe('SDU');
    });

    it('recusa um segundo alerta', async () => {
      alertas.findOne.mockResolvedValue(criarAlerta());

      await expect(service.create(criarDto())).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(alertas.save).not.toHaveBeenCalled();
    });

    it('traduz a violação do índice único em 409 (duas requisições juntas)', async () => {
      alertas.findOne.mockResolvedValue(null);
      const erro = new QueryFailedError('INSERT', [], {
        code: '23505',
      } as unknown as Error & { code: string });
      alertas.save.mockRejectedValue(erro);

      await expect(service.create(criarDto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('recusa ida no passado', async () => {
      const ontem = somarDias(hoje(), -1);

      await expect(
        service.create(criarDto({ departureDate: ontem, returnDate: ontem })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('aceita ida hoje (não trata o "hoje" como passado)', async () => {
      const criado = await service.create(
        criarDto({ departureDate: hoje(), returnDate: somarDias(hoje(), 3) }),
      );

      expect(criado.departureDate).toBe(hoje());
    });

    it('recusa volta anterior à ida', async () => {
      await expect(
        service.create(
          criarDto({
            departureDate: somarDias(hoje(), 5),
            returnDate: somarDias(hoje(), 1),
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa volta no mesmo dia da ida', async () => {
      await expect(
        service.create(criarDto({ departureDate: IDA, returnDate: IDA })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa origem igual ao destino', async () => {
      await expect(
        service.create(criarDto({ destination: 'gru' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  describe('buscarUnico', () => {
    it('devolve null quando não há alerta', async () => {
      await expect(service.buscarUnico()).resolves.toBeNull();
    });

    it('devolve o alerta como objeto de resposta', async () => {
      alertas.findOne.mockResolvedValue(criarAlerta());

      const alerta = await service.buscarUnico();

      expect(alerta?.targetPrice).toBe(5000);
    });
  });

  // -------------------------------------------------------------------------
  describe('update', () => {
    it('zera o estado de notificação quando o alvo muda', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());

      const resposta = await service.update('id', { targetPrice: 4500 });

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.targetPrice).toBe('4500.00');
      expect(salvo.lastNotifiedPrice).toBeNull();
      expect(salvo.lastNotifiedLevel).toBeNull();
      expect(salvo.lastNotifiedAt).toBeNull();
      expect(resposta.targetPrice).toBe(4500);
    });

    it('preserva o último aviso quando o alvo continua o mesmo', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());

      await service.update('id', { targetPrice: 5000 });

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.lastNotifiedPrice).toBe('2100.00');
    });

    it('pausa sem mexer no estado de notificação', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());

      const resposta = await service.update('id', { active: false });

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.active).toBe(false);
      expect(salvo.lastNotifiedPrice).toBe('2100.00');
      expect(resposta.active).toBe(false);
    });

    it('retomar limpa o contador de falhas', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({ consecutiveFailures: 3, active: false }),
      );

      await service.update('id', { active: true });

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.consecutiveFailures).toBe(0);
    });

    it('recusa atualização sem campos', async () => {
      await expect(service.update('id', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lança 404 quando o alerta não existe', async () => {
      await expect(
        service.update('id', { active: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  describe('remove', () => {
    it('remove o alerta existente', async () => {
      const alerta = criarAlerta();
      alertas.findOneBy.mockResolvedValue(alerta);

      await service.remove('id');

      expect(alertas.remove).toHaveBeenCalledWith(alerta);
    });

    it('lança 404 quando o alerta não existe', async () => {
      await expect(service.remove('id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('checkPrice', () => {
    it('recusa checar alerta pausado sem consultar o provedor', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta({ active: false }));

      await expect(service.checkPrice('id')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(provider.buscarMenorPreco).not.toHaveBeenCalled();
    });

    it('consulta ida e volta exatas', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());

      await service.checkPrice('id');

      const consulta = provider.buscarMenorPreco.mock.calls[0][0] as PriceQuery;
      expect(consulta).toEqual({
        origin: 'GRU',
        destination: 'SDU',
        departureDate: IDA,
        returnDate: VOLTA,
        tripType: 'round_trip',
      });
    });

    it('notifica e grava o estado quando está no alvo', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({
          lastNotifiedPrice: null,
          lastNotifiedLevel: null,
          lastNotifiedAt: null,
        }),
      );

      const resposta = await service.checkPrice('id');

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(telegram.send).toHaveBeenCalledTimes(1);
      expect(salvo.lastNotifiedPrice).toBe('2000.00');
      expect(salvo.lastNotifiedLevel).toBe('OFFER');
      expect(resposta.notified).toBe(true);
      expect(resposta.result).toBe('OFFER');
    });

    it('mensagem traz o link para conferir', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({ lastNotifiedPrice: null }),
      );

      await service.checkPrice('id');

      const texto = telegram.send.mock.calls[0][0] as string;
      expect(texto).toContain('https://www.google.com/travel/flights');
      expect(texto).toContain('R$');
    });

    it('não repete o aviso quando o preço é o mesmo do último aviso', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());
      provider.buscarMenorPreco.mockResolvedValue(cotacao({ price: 2100 }));

      const resposta = await service.checkPrice('id');

      expect(telegram.send).not.toHaveBeenCalled();
      expect(resposta.notified).toBe(false);
    });

    it('sem oferta não notifica e não trata como preço zero', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({ lastNotifiedPrice: null }),
      );
      provider.buscarMenorPreco.mockResolvedValue(null);

      const resposta = await service.checkPrice('id');

      expect(telegram.send).not.toHaveBeenCalled();
      expect(resposta.notified).toBe(false);
      expect(resposta.result).toBeNull();
      expect(resposta.priceCheck.found).toBe(false);
      expect(resposta.priceCheck.price).toBeNull();
    });

    it('não marca o aviso como enviado quando o Telegram falha', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({ lastNotifiedPrice: null }),
      );
      telegram.send.mockResolvedValue(false);

      const resposta = await service.checkPrice('id');

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(resposta.notified).toBe(false);
      expect(salvo.lastNotifiedPrice).toBeNull();
      expect(salvo.consecutiveFailures).toBe(1);
    });

    it('falha do provedor vira erro registrado, não exceção', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());
      provider.buscarMenorPreco.mockRejectedValue(new Error('cota excedida'));

      const resposta = await service.checkPrice('id');

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.lastError).toBe('cota excedida');
      expect(salvo.consecutiveFailures).toBe(1);
      expect(resposta.notified).toBe(false);
      expect(resposta.priceCheck.found).toBe(false);
    });

    it('sucesso limpa o erro anterior', async () => {
      alertas.findOneBy.mockResolvedValue(
        criarAlerta({ lastError: 'antigo', consecutiveFailures: 2 }),
      );

      await service.checkPrice('id');

      const salvo = alertas.save.mock.calls[0][0] as Alert;
      expect(salvo.lastError).toBeNull();
      expect(salvo.consecutiveFailures).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('findPrices', () => {
    it('devolve a série enxuta com preço numérico e datas', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());
      precos.find.mockResolvedValue([
        {
          id: 'check-1',
          price: '1234.50',
          currency: 'BRL',
          departureDate: '2026-12-01',
          returnDate: '2026-12-08',
          airline: 'LATAM',
          source: 'serpapi',
          found: true,
          checkedAt: new Date('2026-10-21T12:00:00Z'),
          alert: criarAlerta(),
        },
      ]);

      const [primeiro] = await service.findPrices('id');

      expect(primeiro).toEqual({
        id: 'check-1',
        price: 1234.5,
        currency: 'BRL',
        departureDate: '2026-12-01',
        returnDate: '2026-12-08',
        airline: 'LATAM',
        source: 'serpapi',
        found: true,
        checkedAt: new Date('2026-10-21T12:00:00Z'),
      });
    });

    it('lança 404 quando o alerta não existe', async () => {
      await expect(service.findPrices('id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('devolve o alvo como número', async () => {
      alertas.findOneBy.mockResolvedValue(criarAlerta());

      const alerta = await service.findOne('id');

      expect(alerta.targetPrice).toBe(5000);
      expect(alerta.lastNotifiedPrice).toBe(2100);
    });

    it('lança 404 quando o alerta não existe', async () => {
      await expect(service.findOne('id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
