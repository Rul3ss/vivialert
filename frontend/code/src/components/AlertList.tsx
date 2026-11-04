import { LoaderCircle } from 'lucide-react';
import aviaoDePapel from '../assets/aviao-papel.svg';
import coracao from '../assets/coracao.svg';
import fundoDoCoracao from '../assets/fundo-coracao.svg';
import orbita from '../assets/orbita.png';
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

/** Ilustração do estado vazio (camadas exportadas do Figma, nas mesmas posições). */
function IlustracaoDeViagem() {
  return (
    <div className="relative h-24 w-36 shrink-0" aria-hidden="true">
      <img
        src={orbita}
        alt=""
        width={112}
        height={64}
        className="absolute top-4 left-4 h-16 w-28"
      />
      <img
        src={fundoDoCoracao}
        alt=""
        width={72}
        height={72}
        className="absolute top-3 left-9 size-18"
      />
      <img
        src={coracao}
        alt=""
        width={32}
        height={32}
        className="absolute top-8 left-[55px] size-8"
      />
      <img
        src={aviaoDePapel}
        alt=""
        width={32}
        height={32}
        className="absolute top-3 left-[104px] size-8"
      />
    </div>
  );
}

export function AlertList({ alerta, carregando, ...acoes }: Props) {
  if (carregando && alerta === null) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm font-bold text-roxo" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Carregando alerta…
      </div>
    );
  }

  if (alerta === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <IlustracaoDeViagem />
        <div className="flex flex-col gap-2">
          <p className="text-lg leading-[1.4] font-bold text-tinta">
            Nenhum alerta por aqui ainda
          </p>
          <p className="text-sm leading-normal text-suave">
            Crie seu primeiro alerta e deixe a gente cuidar do preço para você.
          </p>
        </div>
      </div>
    );
  }

  return <AlertCard alerta={alerta} {...acoes} />;
}
