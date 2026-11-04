import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAlertDto } from './update-alert.dto';

async function errosDe(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(UpdateAlertDto, payload);
  const erros = await validate(dto, { whitelist: true });
  return erros.flatMap((erro) => Object.keys(erro.constraints ?? {}));
}

describe('UpdateAlertDto', () => {
  it('aceita um alvo válido', async () => {
    expect(await errosDe({ targetPrice: 4500 })).toEqual([]);
  });

  it('aceita pausar/retomar', async () => {
    expect(await errosDe({ active: false })).toEqual([]);
  });

  it('recusa alvo nulo (IsOptional deixaria passar e viraria 500)', async () => {
    expect(await errosDe({ targetPrice: null })).toContain('isNumber');
  });

  it('recusa active nulo', async () => {
    expect(await errosDe({ active: null })).toContain('isBoolean');
  });

  it('recusa alvo zero ou negativo', async () => {
    expect(await errosDe({ targetPrice: 0 })).toContain('min');
  });

  it('recusa mais de duas casas decimais', async () => {
    expect(await errosDe({ targetPrice: 10.005 })).toContain('isNumber');
  });

  it('recusa active que não é booleano', async () => {
    expect(await errosDe({ active: 'sim' })).toContain('isBoolean');
  });
});
