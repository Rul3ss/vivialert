import type { Alert, CheckResult } from '../types';
import { AlertCard } from './AlertCard';

interface Props {
  alerta: Alert | null;
  carregando: boolean;
  onAlternar: (alerta: Alert) => Promise<void>;
  onAlterarAlvo: (id: string, alvo: number) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  onChecar: (id: string) => Promise<CheckResult>;
}

const VAZIO =
  'rounded-3xl border border-dashed border-base-300 bg-base-100/60 p-7 text-center text-sm text-base-content/75';

export function AlertList({ alerta, carregando, ...acoes }: Props) {
  if (carregando && alerta === null) {
    return <p className={VAZIO}>Carregando alerta…</p>;
  }

  if (alerta === null) {
    return (
      <div className={VAZIO}>
        <p className="font-semibold text-base-content">
          Nenhum alerta por aqui ainda.
        </p>
        <p className="mx-auto mt-1 max-w-[48ch]">
          Crie o alerta no formulário acima: escolha o trecho, as datas de ida e
          volta e o valor que você topa pagar. O aviso chega no Telegram — sem
          você precisar abrir nada.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <AlertCard alerta={alerta} {...acoes} />
    </div>
  );
}
