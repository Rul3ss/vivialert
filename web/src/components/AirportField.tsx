import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useAirports } from '../hooks/useAirports';
import { Field } from './Field';

interface Props {
  id: string;
  label: string;
  /** Código IATA escolhido (`''` enquanto nada foi escolhido). */
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
}

const LIMITE_SUGESTOES = 8;

/**
 * Combobox de aeroporto: a pessoa digita a cidade e escolhe na lista, que
 * mostra só `UF-IATA`. Depois de escolhido, o campo exibe `SP-CGH` e o
 * formulário guarda só o código IATA.
 */
export function AirportField({ id, label, value, onChange, placeholder }: Props) {
  const { filtrar, codigoCompleto } = useAirports();
  const [texto, setTexto] = useState('');
  const [pesquisando, setPesquisando] = useState(false);
  const [ativo, setAtivo] = useState(0);

  const opcoes = pesquisando ? filtrar(texto, LIMITE_SUGESTOES) : [];
  const aberto = pesquisando && opcoes.length > 0;
  const codigo = value ? codigoCompleto(value) : '';
  const listaId = `${id}-sugestoes`;

  function escolher(iata: string) {
    onChange(iata);
    setTexto('');
    setPesquisando(false);
    setAtivo(0);
  }

  function digitar(novo: string) {
    setTexto(novo);
    setPesquisando(true);
    setAtivo(0);
  }

  function teclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' && opcoes.length > 0) {
      evento.preventDefault();
      setAtivo((indice) => (indice + 1) % opcoes.length);
    } else if (evento.key === 'ArrowUp' && opcoes.length > 0) {
      evento.preventDefault();
      setAtivo((indice) => (indice - 1 + opcoes.length) % opcoes.length);
    } else if (evento.key === 'Enter' && aberto) {
      evento.preventDefault();
      const escolhido = opcoes[ativo];
      if (escolhido) {
        escolher(escolhido.iata);
      }
    } else if (evento.key === 'Escape') {
      // Volta para o aeroporto que já estava escolhido.
      setTexto('');
      setPesquisando(false);
    }
  }

  function sair() {
    if (!pesquisando) {
      return;
    }
    // Sobrou uma única sugestão? Ela é a resposta. Senão, descarta o texto e
    // volta a mostrar o aeroporto que já estava escolhido (nada invisível).
    if (opcoes.length === 1) {
      escolher(opcoes[0].iata);
      return;
    }
    setTexto('');
    setPesquisando(false);
  }

  return (
    <Field htmlFor={id} label={label}>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={aberto ? `${id}-opcao-${ativo}` : undefined}
          autoComplete="off"
          className="input w-full"
          value={pesquisando ? texto : codigo}
          placeholder={placeholder}
          onChange={(evento) => digitar(evento.target.value)}
          onKeyDown={teclar}
          onFocus={(evento) => evento.currentTarget.select()}
          onBlur={sair}
        />
        {aberto && (
          <ul
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-2xl shadow-primary/10"
            id={listaId}
            role="listbox"
            aria-label={`Sugestões de ${label.toLowerCase()}`}
          >
            {opcoes.map((aeroporto, indice) => (
              <li
                key={aeroporto.iata}
                id={`${id}-opcao-${indice}`}
                role="option"
                aria-selected={indice === ativo}
                className={
                  indice === ativo
                    ? 'cursor-pointer rounded-xl bg-primary/15 px-3 py-2 text-sm font-semibold tracking-[0.12em] text-primary'
                    : 'cursor-pointer rounded-xl px-3 py-2 text-sm tracking-[0.12em] text-base-content/80 hover:bg-base-200'
                }
                onMouseDown={(evento) => {
                  // Sem preventDefault o blur fecharia a lista antes do clique.
                  evento.preventDefault();
                  escolher(aeroporto.iata);
                }}
                onMouseEnter={() => setAtivo(indice)}
              >
                {aeroporto.state}-{aeroporto.iata}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[0.7rem] text-base-content/75">
        Digite a cidade e escolha o aeroporto.
      </p>
    </Field>
  );
}
