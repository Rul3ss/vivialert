import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  /** `id` do campo dentro de `children`, para o rótulo apontar para ele. */
  htmlFor: string;
  label: string;
  /** Mensagem de erro do campo; o `id` dela é `${htmlFor}-erro`. */
  error?: string | null;
  className?: string;
  children: ReactNode;
}

/** Rótulo + campo do formulário, com a linha de erro embaixo quando houver. */
export function Field({ htmlFor, label, error, className = '', children }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-tinta">
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-erro`}
          className="flex items-center gap-2 text-xs font-semibold text-perigo"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
