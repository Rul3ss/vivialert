import {
  Banknote,
  CalendarDays,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  diferencaEmDias,
  hoje,
  mensagemDeErro,
  parsearPreco,
  somarDias,
} from '../format';
import type { CreateAlertInput } from '../types';
import { AirportField } from './AirportField';
import { Field } from './Field';

interface Props {
  onCriar: (input: CreateAlertInput) => Promise<unknown>;
}

type Campo = 'origem' | 'destino' | 'ida' | 'volta' | 'alvo';
type Erros = Partial<Record<Campo, string>>;

const DURACAO_MAXIMA_DIAS = 60;

export function AlertForm({ onCriar }: Props) {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [ida, setIda] = useState('');
  const [volta, setVolta] = useState('');
  const [alvo, setAlvo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  function validar(): { erros: Erros; preco: number | null } {
    const novos: Erros = {};
    if (!origem) novos.origem = 'Escolha a origem na lista de aeroportos.';
    if (!destino) novos.destino = 'Escolha o destino na lista de aeroportos.';
    else if (origem === destino)
      novos.destino = 'Origem e destino precisam ser diferentes.';

    if (!ida) novos.ida = 'Informe a data de ida.';
    if (!volta) novos.volta = 'Informe a data de volta.';
    if (ida && volta) {
      const duracao = diferencaEmDias(ida, volta);
      if (duracao < 1) novos.volta = 'A volta precisa ser depois da ida.';
      else if (duracao > DURACAO_MAXIMA_DIAS)
        novos.volta = `A viagem pode ter no máximo ${DURACAO_MAXIMA_DIAS} dias.`;
    }

    const preco = parsearPreco(alvo);
    if (preco === null) novos.alvo = 'Informe um valor maior que zero.';
    return { erros: novos, preco };
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);

    const { erros: novos, preco } = validar();
    setErros(novos);
    if (Object.keys(novos).length > 0 || preco === null) {
      return;
    }

    setEnviando(true);
    try {
      await onCriar({
        origin: origem,
        destination: destino,
        departureDate: ida,
        returnDate: volta,
        targetPrice: preco,
      });
    } catch (causa) {
      setErroGeral(mensagemDeErro(causa));
    } finally {
      setEnviando(false);
    }
  }

  /** Limpa o erro de um campo assim que a pessoa mexe nele. */
  function limpar(campo: Campo) {
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function descritoPor(campo: Campo) {
    return erros[campo] ? `${campo}-erro` : undefined;
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(evento) => void enviar(evento)}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-6">
        <AirportField
          id="origem"
          label="Origem"
          className="col-span-2 sm:col-span-3"
          value={origem}
          onChange={(valor) => {
            setOrigem(valor);
            limpar('origem');
          }}
          placeholder="Cidade ou aeroporto"
          icon={<PlaneTakeoff aria-hidden="true" />}
          error={erros.origem}
        />

        <AirportField
          id="destino"
          label="Destino"
          className="col-span-2 sm:col-span-3"
          value={destino}
          onChange={(valor) => {
            setDestino(valor);
            limpar('destino');
          }}
          placeholder="Cidade ou aeroporto"
          icon={<PlaneLanding aria-hidden="true" />}
          error={erros.destino}
        />

        <Field htmlFor="ida" label="Ida" error={erros.ida} className="sm:col-span-2">
          <div className="entrada" data-erro={Boolean(erros.ida)}>
            {/* No celular as datas ficam sem ícone, como no design. */}
            <CalendarDays className="max-sm:hidden" aria-hidden="true" />
            <input
              id="ida"
              type="date"
              value={ida}
              min={hoje()}
              aria-invalid={Boolean(erros.ida)}
              aria-describedby={descritoPor('ida')}
              onChange={(evento) => {
                const valor = evento.target.value;
                setIda(valor);
                limpar('ida');
                // Volta que deixou de ser posterior à ida é limpa.
                if (volta && valor && volta <= valor) {
                  setVolta('');
                }
              }}
              required
            />
          </div>
        </Field>

        <Field htmlFor="volta" label="Volta" error={erros.volta} className="sm:col-span-2">
          <div className="entrada" data-erro={Boolean(erros.volta)}>
            <CalendarDays className="max-sm:hidden" aria-hidden="true" />
            <input
              id="volta"
              type="date"
              value={volta}
              min={ida ? somarDias(ida, 1) : hoje()}
              aria-invalid={Boolean(erros.volta)}
              aria-describedby={descritoPor('volta')}
              onChange={(evento) => {
                setVolta(evento.target.value);
                limpar('volta');
              }}
              required
            />
          </div>
        </Field>

        <Field
          htmlFor="alvo"
          label="Valor (R$)"
          error={erros.alvo}
          className="col-span-2"
        >
          <div className="entrada" data-erro={Boolean(erros.alvo)}>
            <Banknote
              className={erros.alvo ? 'text-perigo!' : undefined}
              aria-hidden="true"
            />
            <input
              id="alvo"
              inputMode="decimal"
              value={alvo}
              aria-invalid={Boolean(erros.alvo)}
              aria-describedby={descritoPor('alvo')}
              onChange={(evento) => {
                setAlvo(evento.target.value);
                limpar('alvo');
              }}
              placeholder="Seu preço ideal"
              required
            />
          </div>
        </Field>
      </div>

      {erroGeral && (
        <p
          className="rounded-2xl bg-perigo-fundo p-4 text-sm font-semibold text-perigo"
          role="alert"
        >
          {erroGeral}
        </p>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center justify-center gap-2 text-xs font-semibold text-suave sm:text-sm sm:font-medium">
          <Send className="size-4 shrink-0" aria-hidden="true" />
          Avisos direto no seu Telegram
        </p>
        <button
          type="submit"
          className="acao acao-marca w-full sm:w-auto"
          disabled={enviando}
        >
          <Plus aria-hidden="true" />
          {enviando ? 'Criando…' : 'Criar alerta'}
        </button>
      </div>
    </form>
  );
}
