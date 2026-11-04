import { useEffect, useState } from 'react';
import * as api from '../api';
import { mensagemDeErro } from '../format';
import type { Airport } from '../types';

/**
 * A lista é estática, então buscamos uma vez por sessão e compartilhamos entre
 * todos os campos: `??=` guarda a promise, assim dois componentes que montam
 * juntos não disparam duas requisições.
 */
let cache: Promise<Airport[]> | null = null;

function carregar(): Promise<Airport[]> {
  cache ??= api.listAirports().catch((causa: unknown) => {
    // Falha não fica cacheada: a próxima montagem tenta de novo.
    cache = null;
    throw causa;
  });
  return cache;
}

/** "São Paulo" e "sao paulo" casam igual (mesma regra do backend). */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Mesmo ranking do backend: IATA, cidade e só então nome oficial. */
function pontuar(aeroporto: Airport, busca: string): number {
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

export function useAirports() {
  const [aeroportos, setAeroportos] = useState<Airport[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;
    carregar()
      .then((lista) => {
        if (montado) {
          setAeroportos(lista);
          setErro(null);
        }
      })
      .catch((causa: unknown) => {
        if (montado) setErro(mensagemDeErro(causa));
      })
      .finally(() => {
        if (montado) setCarregando(false);
      });
    return () => {
      montado = false;
    };
  }, []);

  /** Sugestões para o que foi digitado; texto vazio não sugere nada. */
  function filtrar(texto: string, limite = 8): Airport[] {
    const busca = normalizar(texto);
    if (!busca) {
      return [];
    }

    return aeroportos
      .map((aeroporto) => ({ aeroporto, peso: pontuar(aeroporto, busca) }))
      .filter(({ peso }) => Number.isFinite(peso))
      .sort(
        (a, b) =>
          a.peso - b.peso ||
          a.aeroporto.city.localeCompare(b.aeroporto.city, 'pt-BR') ||
          a.aeroporto.iata.localeCompare(b.aeroporto.iata),
      )
      .slice(0, limite)
      .map(({ aeroporto }) => aeroporto);
  }

  function buscar(iata: string): Airport | undefined {
    const codigo = iata.toUpperCase();
    return aeroportos.find((aeroporto) => aeroporto.iata === codigo);
  }

  /** `SP-CGH`; aeroporto fora da base (internacional) fica só com o código. */
  function codigoCompleto(iata: string): string {
    const aeroporto = buscar(iata);
    return aeroporto ? `${aeroporto.state}-${aeroporto.iata}` : iata.toUpperCase();
  }

  return { aeroportos, carregando, erro, filtrar, buscar, codigoCompleto };
}
