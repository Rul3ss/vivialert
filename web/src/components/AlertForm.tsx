import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { hoje, mensagemDeErro, parsearPreco, somarDias } from '../format';
import type { CreateAlertInput } from '../types';
import { AirportField } from './AirportField';

interface Props {
  onCriar: (input: CreateAlertInput) => Promise<unknown>;
}

const DURACAO_MAXIMA_DIAS = 60;

function diferencaEmDias(de: string, ate: string): number {
  const inicio = new Date(`${de}T00:00:00`).getTime();
  const fim = new Date(`${ate}T00:00:00`).getTime();
  return Math.round((fim - inicio) / 86_400_000);
}

export function AlertForm({ onCriar }: Props) {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [ida, setIda] = useState('');
  const [volta, setVolta] = useState('');
  const [alvo, setAlvo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    if (!origem) {
      setErro('Escolha a origem na lista de aeroportos.');
      return;
    }

    if (!destino) {
      setErro('Escolha o destino na lista de aeroportos.');
      return;
    }

    if (origem === destino) {
      setErro('Origem e destino precisam ser diferentes.');
      return;
    }

    if (!ida || !volta) {
      setErro('Informe a data de ida e a data de volta.');
      return;
    }

    const duracao = diferencaEmDias(ida, volta);
    if (duracao < 1) {
      setErro('A volta precisa ser depois da ida.');
      return;
    }
    if (duracao > DURACAO_MAXIMA_DIAS) {
      setErro(`A viagem pode ter no máximo ${DURACAO_MAXIMA_DIAS} dias.`);
      return;
    }

    const preco = parsearPreco(alvo);
    if (preco === null) {
      setErro('Informe um alvo válido, por exemplo 1500 ou 1.500,50.');
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
      setErro(mensagemDeErro(causa));
    } finally {
      setEnviando(false);
    }
  }

  const rotulo =
    'text-[0.7rem] font-semibold tracking-[0.12em] text-base-content/80 uppercase';

  return (
    <form
      className="grid grid-cols-1 items-end gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]"
      onSubmit={(evento) => void enviar(evento)}
    >
      <AirportField
        id="origem"
        label="Origem"
        value={origem}
        onChange={setOrigem}
        placeholder="São Paulo"
      />

      <AirportField
        id="destino"
        label="Destino"
        value={destino}
        onChange={setDestino}
        placeholder="Salvador"
      />

      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="ida" className={rotulo}>
          Ida
        </label>
        <input
          id="ida"
          type="date"
          className="input w-full"
          value={ida}
          min={hoje()}
          onChange={(evento) => {
            const valor = evento.target.value;
            setIda(valor);
            // Volta que deixou de ser posterior à ida é limpa.
            if (volta && valor && volta <= valor) {
              setVolta('');
            }
          }}
          required
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="volta" className={rotulo}>
          Volta
        </label>
        <input
          id="volta"
          type="date"
          className="input w-full"
          value={volta}
          min={ida ? somarDias(ida, 1) : hoje()}
          onChange={(evento) => setVolta(evento.target.value)}
          required
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="alvo" className={rotulo}>
          Valor
        </label>
        <div className="flex items-center gap-1 rounded-[var(--radius-field)] border border-base-300 bg-base-100 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <span className="text-sm text-base-content/80" aria-hidden="true">
            R$
          </span>
          <input
            id="alvo"
            inputMode="decimal"
            className="input h-10 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus:outline-none"
            value={alvo}
            onChange={(evento) => setAlvo(evento.target.value)}
            placeholder="1.500,00"
            required
          />
        </div>
      </div>

      <div className="col-span-full flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {erro && (
          <p className="alert alert-error alert-soft text-sm" role="alert">
            {erro}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary rounded-full px-6 shadow-lg shadow-primary/30 sm:ml-auto"
          disabled={enviando}
        >
          <Plus className="size-4" aria-hidden="true" />
          {enviando ? 'Criando…' : 'Criar alerta'}
        </button>
      </div>
    </form>
  );
}
