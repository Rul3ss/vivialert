import { Injectable } from '@nestjs/common';
import { AIRPORTS, type AirportRecord } from './airports.data';

/** Quantas sugestões uma busca por texto devolve. */
const LIMITE_BUSCA = 20;

/**
 * "São Paulo", "sao paulo" e "SAO PAULO" precisam casar igual, então
 * comparamos sempre sem acento e em caixa baixa.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Quanto menor, melhor: código exato antes de prefixo, e cidade antes do nome
 * oficial (ninguém digita "Governor André Franco Montoro").
 */
function pontuar(aeroporto: AirportRecord, busca: string): number {
  const iata = normalizar(aeroporto.iata);
  const cidade = normalizar(aeroporto.city);
  const nome = normalizar(aeroporto.name);

  if (iata === busca) return 0;
  if (iata.startsWith(busca)) return 1;
  if (cidade.startsWith(busca)) return 2;
  if (cidade.includes(busca)) return 3;
  if (nome.includes(busca)) return 4;
  return Number.POSITIVE_INFINITY;
}

@Injectable()
export class AirportsService {
  /** Lista completa: o frontend guarda em cache e filtra localmente. */
  findAll(): readonly AirportRecord[] {
    return AIRPORTS;
  }

  search(termo?: string): readonly AirportRecord[] {
    const busca = normalizar(termo ?? '');
    if (!busca) {
      return AIRPORTS;
    }

    return AIRPORTS.map((aeroporto) => ({
      aeroporto,
      peso: pontuar(aeroporto, busca),
    }))
      .filter(({ peso }) => Number.isFinite(peso))
      .sort(
        (a, b) =>
          a.peso - b.peso ||
          a.aeroporto.city.localeCompare(b.aeroporto.city, 'pt-BR') ||
          a.aeroporto.iata.localeCompare(b.aeroporto.iata),
      )
      .slice(0, LIMITE_BUSCA)
      .map(({ aeroporto }) => aeroporto);
  }
}
