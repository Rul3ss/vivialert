/**
 * Regressão do bug de fuso corrigido na Fase 1.
 *
 * O nome vem de um probe de depuração que o sandbox desta sessão não permitiu
 * apagar nem renomear. O conteúdo é um teste real; ao limpar o repositório,
 * remova este arquivo (o mesmo caso está coberto em `date.spec.ts`).
 */
import { dataNoFuso, hoje } from './date';

describe('regressão: "hoje" não pode ser UTC', () => {
  it('22h de Brasília ainda é o mesmo dia em Brasília', () => {
    // 01:00 UTC de 30/10 = 22:00 de 29/10 em Brasília.
    const instante = new Date('2026-10-30T01:00:00Z');

    expect(dataNoFuso(instante, 'America/Sao_Paulo')).toBe('2026-10-29');
    expect(instante.toISOString().slice(0, 10)).toBe('2026-10-30');
  });

  it('o "hoje" usado na validação vem do fuso do viajante', () => {
    expect(hoje('America/Sao_Paulo', new Date('2026-12-01T02:30:00Z'))).toBe(
      '2026-11-30',
    );
  });
});
