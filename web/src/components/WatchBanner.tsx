import { SatelliteDish, TriangleAlert } from 'lucide-react';
import type { WatchStatus } from '../types';
import { formatarDataHora } from '../format';

interface Props {
  status: WatchStatus | null;
}

function intervaloLegivel(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = minutos / 60;
  if (horas < 24) return `${horas} h`;
  const dias = horas / 24;
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

/**
 * Faixa do vigia automático.
 *
 * Existe para que "o app parou de checar" seja um fato visível, não uma
 * suspeita: sem isso, um vigia morto e um preço alto são a mesma tela.
 */
export function WatchBanner({ status }: Props) {
  if (status === null) {
    return null;
  }

  if (!status.enabled) {
    return (
      <div className="alert alert-warning alert-soft text-sm" role="status">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span>
          O vigia automático está <strong>desligado</strong>. O preço só é
          consultado no botão “Checar preço”.
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-base-300 bg-base-100/70 px-4 py-2.5 text-xs text-base-content/85"
      role="status"
    >
      <SatelliteDish className="size-4 shrink-0 text-success" aria-hidden="true" />
      <span>
        Vigia automático ligado · checa a cada{' '}
        <strong>{intervaloLegivel(status.intervalMinutes)}</strong>
      </span>
      <span className="text-base-content/60" aria-hidden="true">
        ·
      </span>
      <span>
        última checagem:{' '}
        <strong>{formatarDataHora(status.lastRunAt)}</strong>
      </span>
    </div>
  );
}
