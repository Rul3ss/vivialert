interface Props {
  active: boolean;
}

export function StatusBadge({ active }: Props) {
  return (
    <span
      className={
        active
          ? 'badge gap-1.5 border-0 bg-success/30 text-[0.7rem] font-semibold text-success-content'
          : 'badge gap-1.5 border-0 bg-base-300/70 text-[0.7rem] font-semibold text-base-content/80'
      }
    >
      <span
        className="inline-block size-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {active ? 'Ativo' : 'Pausado'}
    </span>
  );
}
