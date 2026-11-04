import { useEffect, useState } from 'react';
import { getWatchStatus } from '../api';
import type { WatchStatus } from '../types';

/**
 * Estado do vigia automático. É o que transforma "o app parou de checar" de
 * suspeita em fato visível na tela.
 */
export function useWatchStatus() {
  const [status, setStatus] = useState<WatchStatus | null>(null);

  useEffect(() => {
    let montado = true;

    function carregar() {
      getWatchStatus()
        .then((novo) => {
          if (montado) setStatus(novo);
        })
        .catch(() => {
          // Sem status não quebramos a tela: o card mostra "—".
        });
    }

    carregar();
    // O intervalo é de horas; atualizar de minuto em minuto basta.
    const timer = setInterval(carregar, 60_000);
    return () => {
      montado = false;
      clearInterval(timer);
    };
  }, []);

  return status;
}
