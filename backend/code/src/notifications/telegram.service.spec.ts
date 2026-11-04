import { Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

type RespostaFetch = Awaited<ReturnType<typeof fetch>>;

const resposta = (status: number, corpo: unknown): RespostaFetch =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo),
  }) as unknown as RespostaFetch;

describe('TelegramService', () => {
  const fetchOriginal = globalThis.fetch;
  const envOriginal = { ...process.env };
  const fetchMock = jest.fn<Promise<RespostaFetch>, Parameters<typeof fetch>>();

  let servico: TelegramService;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-de-teste';
    process.env.TELEGRAM_CHAT_ID = '123';
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    servico = new TelegramService();
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  function corpoEnviado(): Record<string, unknown> {
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    return JSON.parse(init.body as string) as Record<string, unknown>;
  }

  it('não envia quando falta configuração', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    await expect(servico.send('oi')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia para o chat do ambiente e retorna true', async () => {
    fetchMock.mockResolvedValue(resposta(200, { ok: true }));

    await expect(servico.send('Oferta!')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.telegram.org/bottoken-de-teste/sendMessage',
    );
    expect(corpoEnviado()).toMatchObject({
      chat_id: '123',
      text: 'Oferta!',
    });
  });

  it('usa o chatId informado como destinatário', async () => {
    fetchMock.mockResolvedValue(resposta(200, { ok: true }));

    await expect(servico.send('Oferta!', '999')).resolves.toBe(true);

    expect(corpoEnviado()).toMatchObject({ chat_id: '999' });
  });

  it('loga a descrição do Telegram e retorna false em erro', async () => {
    const erro = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    fetchMock.mockResolvedValue(
      resposta(400, { ok: false, description: 'chat not found' }),
    );

    await expect(servico.send('Oferta!')).resolves.toBe(false);

    expect(erro).toHaveBeenCalledWith(
      expect.stringContaining('chat not found'),
    );
  });

  it('tenta de novo quando o Telegram responde 429', async () => {
    fetchMock
      .mockResolvedValueOnce(
        resposta(429, { ok: false, parameters: { retry_after: 0 } }),
      )
      .mockResolvedValueOnce(resposta(200, { ok: true }));

    await expect(servico.send('Oferta!')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retorna false quando o fetch lança exceção', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(servico.send('Oferta!')).resolves.toBe(false);
  });
});
