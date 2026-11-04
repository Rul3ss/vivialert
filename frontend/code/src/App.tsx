import { Heart, RefreshCw } from 'lucide-react';
import { AlertForm } from './components/AlertForm';
import { AlertList } from './components/AlertList';
import { Section } from './components/Section';
import { WatchBanner } from './components/WatchBanner';
import { useAlerts } from './hooks/useAlerts';
import { useWatchStatus } from './hooks/useWatchStatus';

export default function App() {
  const {
    alerta,
    carregando,
    erro,
    recarregar,
    criar,
    alternarAtivo,
    alterarAlvo,
    excluir,
    checar,
  } = useAlerts();

  const vigia = useWatchStatus();

  return (
    <div className="mx-auto flex w-[calc(100%-1.5rem)] flex-col gap-5 py-6 sm:w-[min(1120px,calc(100%-2.5rem))] sm:gap-7 sm:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-[clamp(2rem,4vw,2.75rem)] font-bold tracking-tight">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-lg shadow-primary/30">
              <Heart className="size-6" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ViviAlert
            </span>
          </h1>
          <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-base-content/80">
            Você define o trecho e o alvo; o Telegram avisa quando aparece
            passagem na faixa — sem precisar abrir nada.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            className="btn btn-ghost rounded-full border border-base-300 bg-base-100/70"
            onClick={() => void recarregar()}
            disabled={carregando}
          >
            <RefreshCw
              className={carregando ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
          <span className="badge badge-soft badge-neutral text-xs">
            {alerta ? '1 alerta' : 'nenhum alerta'} · 1 por vez
          </span>
        </div>
      </header>

      <WatchBanner status={vigia} />

      <main className="flex flex-col gap-7">
        {alerta === null && (
          <Section id="titulo-form" title="Novo alerta">
            <AlertForm onCriar={criar} />
          </Section>
        )}

        <Section
          id="titulo-lista"
          title="Seu alerta"
          aside={
            <span className="text-[0.72rem] text-base-content/75">
              O sistema acompanha um alerta por vez (limite da cota da API de
              preços).
            </span>
          }
        >
          {erro && (
            <div className="alert alert-error alert-soft" role="alert">
              <span>{erro}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs rounded-full"
                onClick={() => void recarregar()}
              >
                Tentar de novo
              </button>
            </div>
          )}

          <AlertList
            alerta={alerta}
            carregando={carregando}
            onAlternar={alternarAtivo}
            onAlterarAlvo={alterarAlvo}
            onExcluir={excluir}
            onChecar={checar}
          />

          {alerta !== null && (
            <p className="text-[0.72rem] leading-relaxed text-base-content/75">
              Para monitorar outro trecho, exclua este alerta e crie o novo.
            </p>
          )}
        </Section>
      </main>

      <footer className="text-center text-xs leading-relaxed text-base-content/75">
        Preços de ida e volta por pessoa. O aviso traz o link para conferir a
        oferta antes de comprar.
      </footer>
    </div>
  );
}
