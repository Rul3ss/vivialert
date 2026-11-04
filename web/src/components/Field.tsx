import type { ReactNode } from 'react';

interface Props {
  /** `id` do campo dentro de `children`, para o rótulo apontar para ele. */
  htmlFor: string;
  label: string;
  children: ReactNode;
}

/** Rótulo + campo do formulário, com o estilo padrão da tela. */
export function Field({ htmlFor, label, children }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[0.7rem] font-semibold tracking-[0.12em] text-base-content/80 uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
