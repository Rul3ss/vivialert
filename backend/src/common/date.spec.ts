import {
  dataNoFuso,
  diasEntre,
  diferencaEmDias,
  hoje,
  isDataPura,
  somarDias,
} from './date';

describe('datas', () => {
  it('usa a data de Brasília, não UTC (bug do toISOString)', () => {
    // 2026-10-30 01:00 UTC = 29/10 22:00 em Brasília (UTC-3).
    const instante = new Date('2026-10-30T01:00:00Z');

    expect(dataNoFuso(instante, 'America/Sao_Paulo')).toBe('2026-10-29');
    expect(dataNoFuso(instante, 'UTC')).toBe('2026-10-30');
    // Regressão: o jeito antigo devolvia "amanhã" às 22h em Brasília.
    expect(instante.toISOString().slice(0, 10)).not.toBe(
      dataNoFuso(instante, 'America/Sao_Paulo'),
    );
  });

  it('vira o dia no horário certo em Brasília', () => {
    // 03:00 UTC = 00:00 em Brasília: já é o dia seguinte lá.
    expect(dataNoFuso(new Date('2026-10-30T02:59:59Z'), 'America/Sao_Paulo')).toBe(
      '2026-10-29',
    );
    expect(dataNoFuso(new Date('2026-10-30T03:00:00Z'), 'America/Sao_Paulo')).toBe(
      '2026-10-30',
    );
  });

  it('hoje() devolve o formato AAAA-MM-DD', () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('soma dias atravessando mês e ano', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarDias('2028-03-01', -1)).toBe('2028-02-29'); // bissexto
  });

  it('diferença em dias é simétrica', () => {
    expect(diferencaEmDias('2026-12-01', '2026-12-10')).toBe(9);
    expect(diferencaEmDias('2026-12-10', '2026-12-01')).toBe(-9);
  });

  it('diasEntre inclui as pontas', () => {
    expect(diasEntre('2026-12-01', '2026-12-04')).toEqual([
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
    ]);
  });

  it('rejeita data inexistente', () => {
    expect(isDataPura('2026-02-31')).toBe(false);
    expect(isDataPura('2026-02-28')).toBe(true);
    expect(isDataPura('28/02/2026')).toBe(false);
  });
});
