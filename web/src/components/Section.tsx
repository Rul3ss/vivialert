import type { ReactNode } from 'react';

interface Props {
  /** `id` do título, usado pelo `aria-labelledby` da seção. */
  id: string;
  title: string;
  /** Texto opcional à direita do título. */
  aside?: ReactNode;
  children: ReactNode;
}

/** Card de seção da página principal. */
export function Section({ id, title, aside, children }: Props) {
  return (
    <section
      className="card border border-base-300 bg-base-100/85 shadow-xl shadow-primary/5 backdrop-blur"
      aria-labelledby={id}
    >
      <div className="card-body gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id={id}
            className="card-title text-xs font-semibold tracking-[0.18em] text-base-content/80 uppercase"
          >
            {title}
          </h2>
          {aside}
        </div>
        {children}
      </div>
    </section>
  );
}
