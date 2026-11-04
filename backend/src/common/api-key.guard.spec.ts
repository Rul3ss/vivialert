import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function contexto(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const envOriginal = { ...process.env };
  const guard = new ApiKeyGuard();

  beforeEach(() => {
    process.env.API_KEY = 'chave-de-teste-com-tamanho-suficiente';
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('aceita Authorization: Bearer', () => {
    expect(
      guard.canActivate(
        contexto({ authorization: 'Bearer chave-de-teste-com-tamanho-suficiente' }),
      ),
    ).toBe(true);
  });

  it('aceita o header x-api-key', () => {
    expect(
      guard.canActivate(contexto({ 'x-api-key': 'chave-de-teste-com-tamanho-suficiente' })),
    ).toBe(true);
  });

  it('recusa sem chave', () => {
    expect(() => guard.canActivate(contexto({}))).toThrow(UnauthorizedException);
  });

  it('recusa chave errada', () => {
    expect(() =>
      guard.canActivate(contexto({ 'x-api-key': 'chave-errada-de-teste-xxxxxxxx' })),
    ).toThrow(UnauthorizedException);
  });

  it('recusa chave com prefixo correto mas tamanho diferente', () => {
    expect(() =>
      guard.canActivate(contexto({ 'x-api-key': 'chave-de-teste-com-tamanho-suficient' })),
    ).toThrow(UnauthorizedException);
  });

  it('sem API_KEY configurada, não deixa passar', () => {
    delete process.env.API_KEY;

    expect(() => guard.canActivate(contexto({ 'x-api-key': 'qualquer' }))).toThrow(
      UnauthorizedException,
    );
  });
});
