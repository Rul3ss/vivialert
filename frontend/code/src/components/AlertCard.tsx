import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ROTULO_RESULTADO,
  formatarData,
  formatarDataHora,
  formatarPreco,
  mensagemDeErro,
  parsearPreco,
} from '../format';
import type { Alert, CheckResult } from '../types';
import { useAirports } from '../hooks/useAirports';
import { PriceHistory } from './PriceHistory';

interface Props {
  alerta: Alert;
  onAlternar: (alerta: Alert) => Promise<void>;
  onAlterarAlvo: (id: string, alvo: number) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  onChecar: (id: string) => Promise<CheckResult>;
}

type Ocupado = 'checar' | 'pausar' | 'alvo' | 'excluir' | null;

/** Retorno de uma ação, no formato das faixas do design (título + texto). */
interface Mensagem {
  tipo: 'erro' | 'sucesso';
  titulo: string;
  texto?: string;
}

/** Um bloco do resumo: rótulo, valor em destaque e uma nota embaixo. */
function Info({
  titulo,
  nota,
  destaque = false,
  children,
}: {
  titulo: string;
  nota: string;
  destaque?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <dt className="text-sm font-semibold text-suave">{titulo}</dt>
      <dd
        className={
          destaque
            ? 'text-2xl leading-[1.3] font-bold text-marca tabular-nums'
            : 'text-base leading-[1.3] font-bold text-tinta tabular-nums'
        }
      >
        {children}
      </dd>
      <dd className="text-xs leading-normal font-medium text-suave">{nota}</dd>
    </div>
  );
}

/** Faixa de erro (rosada) ou de sucesso (verde) com ícone, título e texto. */
export function Faixa({ tipo, titulo, texto }: Mensagem) {
  const erro = tipo === 'erro';
  const Icone = erro ? CircleAlert : CircleCheck;
  return (
    <div
      className={
        erro
          ? 'flex items-start gap-4 rounded-2xl bg-perigo-fundo p-4 text-perigo'
          : 'flex items-start gap-4 rounded-2xl bg-sucesso-fundo p-4 text-sucesso'
      }
      role={erro ? 'alert' : 'status'}
    >
      <Icone className="size-6 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 leading-normal">
        <p className="text-base font-bold">{titulo}</p>
        {texto && <p className="text-sm">{texto}</p>}
      </div>
    </div>
  );
}

export function AlertCard({
  alerta,
  onAlternar,
  onAlterarAlvo,
  onExcluir,
  onChecar,
}: Props) {
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [editando, setEditando] = useState(false);
  const [novoAlvo, setNovoAlvo] = useState('');
  const [erroAlvo, setErroAlvo] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const { buscar, codigoCompleto } = useAirports();
  const origemCodigo = codigoCompleto(alerta.origin);
  const destinoCodigo = codigoCompleto(alerta.destination);
  const origemCidade = buscar(alerta.origin)?.city ?? alerta.origin;
  const destinoCidade = buscar(alerta.destination)?.city ?? alerta.destination;

  function erro(titulo: string, texto?: string) {
    setMensagem({ tipo: 'erro', titulo, texto });
  }

  function sucesso(titulo: string, texto?: string) {
    setMensagem({ tipo: 'sucesso', titulo, texto });
  }

  /**
   * Esqueleto comum das ações do card: trava os botões, limpa as mensagens,
   * roda a ação e mostra o erro se ela falhar.
   */
  async function executar(tipo: Exclude<Ocupado, null>, acao: () => Promise<void>) {
    setOcupado(tipo);
    setMensagem(null);
    try {
      await acao();
    } catch (causa) {
      erro('Algo deu errado', mensagemDeErro(causa));
    } finally {
      setOcupado(null);
    }
  }

  function checar() {
    return executar('checar', async () => {
      const resultado = await onChecar(alerta.id);
      const preco = resultado.priceCheck.price;
      if (!resultado.priceCheck.found || preco === null) {
        if (resultado.alert.lastError) {
          erro('A consulta falhou', resultado.alert.lastError);
        } else {
          erro(
            `Nenhum voo encontrado para ${origemCodigo} → ${destinoCodigo}`,
            `De ${formatarData(alerta.departureDate)} a ${formatarData(
              alerta.returnDate,
            )}. Tente outras datas ou um aeroporto próximo.`,
          );
        }
      } else if (resultado.notified) {
        sucesso(
          'Aviso enviado no Telegram',
          `Encontramos uma passagem por ${formatarPreco(preco)} (${
            resultado.result ? ROTULO_RESULTADO[resultado.result] : '—'
          }). Boa viagem!`,
        );
      } else {
        sucesso(
          `Checado em ${formatarPreco(preco)}`,
          'Sem aviso novo: acima do alvo ou mesmo valor do último aviso.',
        );
      }
    });
  }

  function alternar() {
    return executar('pausar', () => onAlternar(alerta));
  }

  function excluir() {
    const confirmado = window.confirm(
      `Excluir o alerta ${origemCodigo} → ${destinoCodigo}? Só existe um alerta por vez: você poderá criar outro depois.`,
    );
    if (!confirmado) return;
    return executar('excluir', () => onExcluir(alerta.id));
  }

  function salvarAlvo(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const preco = parsearPreco(novoAlvo);
    if (preco === null) {
      setErroAlvo('Informe um valor maior que zero.');
      return;
    }
    setErroAlvo(null);
    return executar('alvo', async () => {
      await onAlterarAlvo(alerta.id, preco);
      setEditando(false);
    });
  }

  const travado = ocupado !== null;
  const linkGoogle = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${alerta.origin} to ${alerta.destination} on ${alerta.departureDate} through ${alerta.returnDate}`,
  )}&hl=pt-BR&gl=BR&curr=BRL`;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-[22px] font-bold text-roxo sm:text-[28px]">
          {origemCodigo} → {destinoCodigo}
        </h3>
        <p className="text-sm font-semibold text-tinta">
          {origemCidade} → {destinoCidade}
        </p>
        <p className="flex items-center gap-2 text-sm font-medium text-suave">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {formatarData(alerta.departureDate)} a {formatarData(alerta.returnDate)} · ida
          e volta
        </p>
      </div>

      {alerta.lastError && (
        <p
          className="flex items-start gap-2 rounded-2xl bg-perigo-fundo p-4 text-sm font-semibold text-perigo"
          role="alert"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Última checagem com problema: {alerta.lastError}
            {alerta.consecutiveFailures > 1
              ? ` (${alerta.consecutiveFailures} falhas seguidas)`
              : ''}
          </span>
        </p>
      )}

      <dl className="flex flex-col gap-6 rounded-2xl bg-rosado p-4 sm:flex-row sm:gap-8 sm:p-6">
        <Info titulo="Alvo" nota="Este valor ou menos" destaque>
          {formatarPreco(alerta.targetPrice)}
        </Info>
        <div className="flex gap-4 sm:contents">
          <Info
            titulo="Último aviso"
            nota={
              alerta.lastNotifiedLevel === null
                ? 'Nenhum aviso enviado ainda'
                : formatarDataHora(alerta.lastNotifiedAt)
            }
          >
            {alerta.lastNotifiedPrice === null
              ? '—'
              : formatarPreco(alerta.lastNotifiedPrice)}
          </Info>
          <Info titulo="Última checagem" nota="Horário de Brasília">
            {formatarDataHora(alerta.lastCheckedAt)}
          </Info>
        </div>
      </dl>

      {!alerta.active && (
        <p className="text-sm leading-normal text-suave">
          As buscas estão pausadas. Retome quando quiser receber novos avisos.
        </p>
      )}

      {ocupado === 'checar' && (
        <div className="flex flex-col gap-4 rounded-3xl border border-linha p-6" role="status">
          <p className="text-base font-bold text-tinta">Consultando as companhias aéreas</p>
          <p className="text-sm leading-normal text-suave">
            Estamos buscando o melhor preço para {origemCidade} → {destinoCidade}.
          </p>
        </div>
      )}

      {mensagem && <Faixa {...mensagem} />}

      <hr className="border-linha" />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          className="acao acao-lilas"
          onClick={() => void checar()}
          disabled={!alerta.active || travado}
          title={alerta.active ? 'Consultar o preço agora' : 'Retome o alerta para checar'}
        >
          {ocupado === 'checar' ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {ocupado === 'checar' ? 'Checando preço…' : 'Checar preço'}
        </button>
        <button
          type="button"
          className="acao acao-lilas"
          onClick={() => void alternar()}
          disabled={travado}
        >
          {alerta.active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {alerta.active ? 'Pausar' : 'Retomar'}
        </button>
        <button
          type="button"
          className="acao acao-lilas"
          onClick={() => {
            setNovoAlvo(alerta.targetPrice.toFixed(2));
            setErroAlvo(null);
            setEditando(true);
            setMensagem(null);
          }}
          disabled={travado || editando}
        >
          <Pencil aria-hidden="true" />
          Editar alvo
        </button>
        <button
          type="button"
          className="acao acao-lilas"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
        >
          <Clock3 aria-hidden="true" />
          {aberto ? 'Ocultar histórico' : 'Histórico'}
        </button>
        <a
          className="acao acao-livre"
          href={linkGoogle}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink aria-hidden="true" />
          Ver no Google
        </a>
        <button
          type="button"
          className="acao acao-livre acao-perigo"
          onClick={() => void excluir()}
          disabled={travado}
        >
          <Trash2 aria-hidden="true" />
          {ocupado === 'excluir' ? 'Excluindo…' : 'Excluir'}
        </button>
      </div>

      {editando && (
        <form
          className="flex flex-col gap-4 rounded-2xl bg-rosado p-4 sm:p-6"
          noValidate
          onSubmit={(evento) => void salvarAlvo(evento)}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`alvo-${alerta.id}`} className="text-sm font-bold text-tinta">
              Novo alvo (R$)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="entrada sm:max-w-xs" data-erro={Boolean(erroAlvo)}>
                <input
                  id={`alvo-${alerta.id}`}
                  inputMode="decimal"
                  value={novoAlvo}
                  aria-invalid={Boolean(erroAlvo)}
                  aria-describedby={erroAlvo ? `alvo-${alerta.id}-erro` : undefined}
                  onChange={(evento) => setNovoAlvo(evento.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="submit" className="acao acao-marca" disabled={travado}>
                  {ocupado === 'alvo' ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className="acao acao-livre"
                  onClick={() => setEditando(false)}
                  disabled={travado}
                >
                  Cancelar
                </button>
              </div>
            </div>
            {erroAlvo && (
              <p
                id={`alvo-${alerta.id}-erro`}
                className="flex items-center gap-2 text-xs font-semibold text-perigo"
              >
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {erroAlvo}
              </p>
            )}
          </div>
          <p className="text-xs leading-normal text-suave">
            Mudar o alvo libera um novo aviso, mesmo que o preço repita o valor do
            último aviso.
          </p>
        </form>
      )}

      {aberto && <PriceHistory alertId={alerta.id} />}
    </article>
  );
}
