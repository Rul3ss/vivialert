import { BellPlus, Heart, RefreshCw } from 'lucide-react';
import { AlertForm } from './components/AlertForm';
import { AlertList } from './components/AlertList';
import { Section } from './components/Section';
import { StatusBadge } from './components/StatusBadge';
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
    <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-16 sm:pt-10 sm:pb-8">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-1px] text-marca sm:text-[28px]">
            <span className="grid size-10 place-items-center rounded-2xl bg-marca text-white">
              <Heart className="size-6" aria-hidden="true" />
            </span>
            ViviAlert
          </h1>
          <button
            type="button"
            className="acao acao-lilas"
            onClick={() => void recarregar()}
            disabled={carregando}
          >
            <RefreshCw
              className={carregando ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl leading-[1.25] font-bold text-tinta sm:text-[32px]">
            Bons preços. Novas histórias.
          </p>
          <p className="text-base leading-normal font-medium text-suave">
            Você escolhe o preço. A gente avisa no Telegram.
          </p>
        </div>
      </header>

      <WatchBanner status={vigia} />

      <main className="flex flex-col gap-6 sm:gap-8">
        {alerta === null && (
          <Section
            id="titulo-form"
            title="Novo alerta"
            icon={<BellPlus className="size-6 text-marca" aria-hidden="true" />}
            subtitle="Qual viagem está nos seus planos?"
          >
            <AlertForm onCriar={criar} />
          </Section>
        )}

        <Section
          id="titulo-lista"
          title="Seu alerta"
          aside={
            alerta ? (
              <StatusBadge active={alerta.active} />
            ) : (
              <span className="text-xs font-medium text-suave">1 alerta por vez</span>
            )
          }
        >
          {erro && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-perigo-fundo p-4 text-sm text-perigo"
              role="alert"
            >
              <span className="font-semibold">{erro}</span>
              <button
                type="button"
                className="acao acao-livre acao-perigo h-9"
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
            <p className="text-xs leading-normal text-suave">
              Para monitorar outro trecho, exclua este alerta e crie o novo.
            </p>
          )}
        </Section>
      </main>

      <footer className="flex flex-col gap-2 pt-2 text-center text-suave">
        <p className="text-sm font-medium">
          ViviAlert · Mais perto da sua próxima viagem.
        </p>
        <p className="mx-auto max-w-[34ch] text-xs leading-normal sm:max-w-none">
          Preços sujeitos à disponibilidade das companhias aéreas.
        </p>
      </footer>
    </div>
  );
}
