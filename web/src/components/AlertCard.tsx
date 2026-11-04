import {
  BellRing,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ROTULO_RESULTADO,
  diasAte,
  formatarData,
  formatarDataHora,
  formatarPreco,
  mensagemDeErro,
  parsearPreco,
  rotuloContagem,
} from '../format';
import type { Alert, CheckResult } from '../types';
import { useAirports } from '../hooks/useAirports';
import { PriceHistory } from './PriceHistory';
import { StatusBadge } from './StatusBadge';

interface Props {
  alerta: Alert;
  onAlternar: (alerta: Alert) => Promise<void>;
  onAlterarAlvo: (id: string, alvo: number) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  onChecar: (id: string) => Promise<CheckResult>;
}

type Ocupado = 'checar' | 'pausar' | 'alvo' | 'excluir' | null;

export function AlertCard({
  alerta,
  onAlternar,
  onAlterarAlvo,
  onExcluir,
  onChecar,
}: Props) {
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [novoAlvo, setNovoAlvo] = useState('');
  const [aberto, setAberto] = useState(false);

  const { codigoCompleto } = useAirports();
  const origemCodigo = codigoCompleto(alerta.origin);
  const destinoCodigo = codigoCompleto(alerta.destination);

  function limparMensagens() {
    setErro(null);
    setAviso(null);
  }

  async function checar() {
    setOcupado('checar');
    limparMensagens();
    try {
      const resultado = await onChecar(alerta.id);
      if (!resultado.priceCheck.found || resultado.priceCheck.price === null) {
        setAviso('Consulta feita, mas não havia oferta para essas datas agora.');
      } else if (resultado.notified) {
        setAviso(
          `Aviso enviado no Telegram: ${formatarPreco(
            resultado.priceCheck.price,
          )} (${resultado.result ? ROTULO_RESULTADO[resultado.result] : '—'}).`,
        );
      } else {
        setAviso(
          `Checado em ${formatarPreco(
            resultado.priceCheck.price,
          )} — sem aviso novo (acima do alvo ou mesmo valor do último aviso).`,
        );
      }
    } catch (causa) {
      setErro(mensagemDeErro(causa));
    } finally {
      setOcupado(null);
    }
  }

  async function alternar() {
    setOcupado('pausar');
    limparMensagens();
    try {
      await onAlternar(alerta);
    } catch (causa) {
      setErro(mensagemDeErro(causa));
    } finally {
      setOcupado(null);
    }
  }

  async function excluir() {
    if (
      !window.confirm(
        `Excluir o alerta ${origemCodigo} → ${destinoCodigo}? Só existe um alerta por vez: você poderá criar outro depois.`,
      )
    ) {
      return;
    }
    setOcupado('excluir');
    limparMensagens();
    try {
      await onExcluir(alerta.id);
    } catch (causa) {
      setErro(mensagemDeErro(causa));
      setOcupado(null);
    }
  }

  async function salvarAlvo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const preco = parsearPreco(novoAlvo);
    if (preco === null) {
      setErro('Informe um alvo válido, por exemplo 1500.');
      return;
    }
    setOcupado('alvo');
    limparMensagens();
    try {
      await onAlterarAlvo(alerta.id, preco);
      setEditando(false);
    } catch (causa) {
      setErro(mensagemDeErro(causa));
    } finally {
      setOcupado(null);
    }
  }

  const dias = diasAte(alerta.departureDate);
  const travado = ocupado !== null;

  return (
    <article
      className={
        alerta.active
          ? 'card border border-base-300 bg-base-100 shadow-lg shadow-primary/5'
          : 'card border border-dashed border-base-300 bg-base-100/60 opacity-80'
      }
    >
      <div className="card-body gap-3.5 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-xl font-bold tracking-[0.1em]">
              {origemCodigo}
              <span className="text-base-content/40" aria-hidden="true">
                →
              </span>
              {destinoCodigo}
            </h3>
            <p className="mt-0.5 text-xs text-base-content/80">
              Ida {formatarData(alerta.departureDate)} · Volta{' '}
              {formatarData(alerta.returnDate)} · {rotuloContagem(dias)}
            </p>
          </div>
          <StatusBadge active={alerta.active} />
        </header>

        {alerta.lastError && (
          <p className="alert alert-warning alert-soft text-sm" role="alert">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Última checagem com problema: {alerta.lastError}
              {alerta.consecutiveFailures > 1
                ? ` (${alerta.consecutiveFailures} falhas seguidas)`
                : ''}
            </span>
          </p>
        )}

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl bg-base-200/70 px-3 py-2">
            <dt className="text-[0.63rem] font-semibold tracking-[0.08em] text-base-content/80 uppercase">
              Alvo
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatarPreco(alerta.targetPrice)}
            </dd>
          </div>
          <div className="rounded-2xl bg-base-200/70 px-3 py-2">
            <dt className="text-[0.63rem] font-semibold tracking-[0.08em] text-base-content/80 uppercase">
              Último aviso
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {alerta.lastNotifiedPrice === null
                ? '—'
                : formatarPreco(alerta.lastNotifiedPrice)}
            </dd>
          </div>
          <div className="rounded-2xl bg-base-200/70 px-3 py-2 last:col-span-2 sm:last:col-span-1">
            <dt className="text-[0.63rem] font-semibold tracking-[0.08em] text-base-content/80 uppercase">
              Última checagem
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatarDataHora(alerta.lastCheckedAt)}
            </dd>
          </div>
        </dl>

        <p className="text-[0.72rem] text-base-content/80">
          {alerta.lastNotifiedLevel === null
            ? 'Nenhum aviso enviado ainda.'
            : `Último aviso: ${ROTULO_RESULTADO[alerta.lastNotifiedLevel]} em ${formatarDataHora(
                alerta.lastNotifiedAt,
              )}.`}
        </p>

        <div className="mt-auto flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-full"
            onClick={() => void checar()}
            disabled={!alerta.active || travado}
            title={
              alerta.active
                ? 'Consultar o preço agora'
                : 'Retome o alerta para checar'
            }
          >
            <BellRing className="size-3.5" aria-hidden="true" />
            {ocupado === 'checar' ? 'Checando…' : 'Checar preço'}
          </button>
          <button
            type="button"
            className="btn btn-sm rounded-full"
            onClick={() => void alternar()}
            disabled={travado}
          >
            {alerta.active ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5" aria-hidden="true" />
            )}
            {alerta.active ? 'Pausar' : 'Retomar'}
          </button>
          <button
            type="button"
            className="btn btn-sm rounded-full"
            onClick={() => {
              setNovoAlvo(alerta.targetPrice.toFixed(2));
              setEditando(true);
              limparMensagens();
            }}
            disabled={travado || editando}
          >
            <CircleDollarSign className="size-3.5" aria-hidden="true" />
            Editar alvo
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-full"
            aria-expanded={aberto}
            onClick={() => setAberto(!aberto)}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {aberto ? 'Ocultar histórico' : 'Histórico'}
          </button>
          <a
            className="btn btn-ghost btn-sm rounded-full"
            href={`https://www.google.com/travel/flights?q=${encodeURIComponent(
              `Flights from ${alerta.origin} to ${alerta.destination} on ${alerta.departureDate} through ${alerta.returnDate}`,
            )}&hl=pt-BR&gl=BR&curr=BRL`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Ver no Google
          </a>
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm rounded-full"
            onClick={() => void excluir()}
            disabled={travado}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {ocupado === 'excluir' ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>

        {editando && (
          <form
            className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-dashed border-base-300 bg-base-200/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            onSubmit={(evento) => void salvarAlvo(evento)}
          >
            <label
              htmlFor={`alvo-${alerta.id}`}
              className="col-span-full text-[0.68rem] font-semibold tracking-[0.12em] text-base-content/80 uppercase"
            >
              Novo alvo
            </label>
            <div className="flex items-center gap-1 rounded-[var(--radius-field)] border border-base-300 bg-base-100 px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
              <span className="text-xs text-base-content/80" aria-hidden="true">
                R$
              </span>
              <input
                id={`alvo-${alerta.id}`}
                inputMode="decimal"
                className="input h-9 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus:outline-none"
                value={novoAlvo}
                onChange={(evento) => setNovoAlvo(evento.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm rounded-full"
              disabled={travado}
            >
              {ocupado === 'alvo' ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-full"
              onClick={() => setEditando(false)}
              disabled={travado}
            >
              Cancelar
            </button>
            <p className="col-span-full text-[0.72rem] leading-relaxed text-base-content/75">
              Mudar o alvo libera um novo aviso, mesmo que o preço repita o
              valor do último aviso.
            </p>
          </form>
        )}

        {erro && (
          <p className="alert alert-error alert-soft text-sm" role="alert">
            {erro}
          </p>
        )}
        {aviso && (
          <p className="alert alert-success alert-soft text-sm" role="status">
            {aviso}
          </p>
        )}

        {aberto && <PriceHistory alertId={alerta.id} />}
      </div>
    </article>
  );
}
