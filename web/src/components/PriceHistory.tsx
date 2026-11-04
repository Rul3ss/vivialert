import { useCallback, useEffect, useState } from 'react';
import { listPrices } from '../api';
import { formatarData, formatarDataHora, formatarPreco, mensagemDeErro } from '../format';
import type { PricePoint } from '../types';

interface Props {
  alertId: string;
}

const VISIVEIS = 8;

const VAZIO =
  'rounded-2xl border border-dashed border-base-300 bg-base-100/60 p-4 text-center text-xs text-base-content/75';

export function PriceHistory({ alertId }: Props) {
  const [pontos, setPontos] = useState<PricePoint[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setPontos(await listPrices(alertId));
    } catch (causa) {
      setErro(mensagemDeErro(causa));
    }
  }, [alertId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return (
      <div className="flex flex-col gap-3 border-t border-dashed border-base-300 pt-3.5">
        <p className="alert alert-error alert-soft text-sm" role="alert">
          {erro}
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-xs self-start rounded-full"
          onClick={() => void carregar()}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (pontos === null) {
    return <p className={VAZIO}>Carregando histórico…</p>;
  }

  if (pontos.length === 0) {
    return (
      <p className={VAZIO}>
        Nenhuma checagem registrada ainda. Use “Checar preço” ou espere o vigia
        automático.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-dashed border-base-300 pt-3.5">
      <ul className="flex flex-col">
        {pontos.slice(0, VISIVEIS).map((ponto) => (
          <li
            key={ponto.id}
            className="flex items-baseline justify-between gap-3 border-b border-base-200 py-1.5 text-sm last:border-0"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold tabular-nums">
                {ponto.found && ponto.price !== null
                  ? formatarPreco(ponto.price)
                  : 'sem oferta'}
              </span>
              {ponto.found && ponto.departureDate && ponto.returnDate && (
                <span className="text-[0.7rem] text-base-content/75">
                  {formatarData(ponto.departureDate)} →{' '}
                  {formatarData(ponto.returnDate)}
                  {ponto.airline ? ` · ${ponto.airline}` : ''}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs text-base-content/80">
              {formatarDataHora(ponto.checkedAt)}
            </span>
          </li>
        ))}
      </ul>
      {pontos.length > VISIVEIS && (
        <p className="text-[0.7rem] text-base-content/75">
          Mostrando as {VISIVEIS} checagens mais recentes de {pontos.length}.
        </p>
      )}
    </div>
  );
}
