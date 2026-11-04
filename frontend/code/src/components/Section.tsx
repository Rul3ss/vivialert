import type { ReactNode } from 'react';

interface Props {
  /** `id` do título, usado pelo `aria-labelledby` da seção. */
  id: string;
  title: string;
  /** Ícone opcional à esquerda do título. */
  icon?: ReactNode;
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  /** Conteúdo opcional à direita do título (status, nota). */
  aside?: ReactNode;
  children: ReactNode;
}

/** Card branco de seção da página principal. */
export function Section({ id, title, icon, subtitle, aside, children }: Props) {
  return (
    <section
      className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-cartao sm:p-8"
      aria-labelledby={id}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={id} className="flex items-center gap-2 text-2xl font-bold text-tinta">
            {icon}
            {title}
          </h2>
          {aside}
        </div>
        {subtitle && (
          <p className="text-sm leading-normal font-medium text-suave">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
