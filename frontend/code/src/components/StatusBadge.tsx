import { Pause } from 'lucide-react';

interface Props {
  active: boolean;
}

/** Selo "Ativo" (ponto roxo, fundo lilás) ou "Pausado" (ícone de pausa). */
export function StatusBadge({ active }: Props) {
  return active ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-lilas px-4 py-2 text-xs font-bold text-roxo">
      <span className="size-2 rounded-full bg-roxo" aria-hidden="true" />
      Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-rosado px-4 py-2 text-xs font-bold text-suave">
      <Pause className="size-3" aria-hidden="true" />
      Pausado
    </span>
  );
}
