import { AirportsService } from './airports.service';

describe('AirportsService', () => {
  const service = new AirportsService();

  describe('findAll', () => {
    it('devolve a base inteira, com os principais aeroportos', () => {
      const aeroportos = service.findAll();
      expect(aeroportos.length).toBeGreaterThan(50);

      const gru = aeroportos.find((aeroporto) => aeroporto.iata === 'GRU');
      expect(gru).toBeDefined();
      expect(gru?.city).toBe('São Paulo');
      expect(gru?.state).toBe('SP');
    });
  });

  describe('search', () => {
    it('sem termo devolve a lista completa', () => {
      expect(service.search()).toHaveLength(service.findAll().length);
      expect(service.search('   ')).toHaveLength(service.findAll().length);
    });

    it('código IATA exato vem primeiro', () => {
      const [primeiro] = service.search('gru');
      expect(primeiro.iata).toBe('GRU');
    });

    it('ignora caixa', () => {
      expect(service.search('GRU')).toEqual(service.search('gru'));
    });

    it('acha por cidade, com ou sem acento', () => {
      const semAcento = service.search('sao paulo').map((a) => a.iata);
      const comAcento = service.search('São Paulo').map((a) => a.iata);

      expect(semAcento).toEqual(comAcento);
      expect(semAcento).toContain('GRU');
      expect(semAcento).toContain('CGH');
    });

    it('devolve vazio quando nada casa', () => {
      expect(service.search('zzz')).toEqual([]);
    });

    it('limita a quantidade de sugestões', () => {
      expect(service.search('a').length).toBeLessThanOrEqual(20);
    });
  });
});
