import { useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useAirports } from '../hooks/useAirports';
import { Field } from './Field';

interface Props {
  id: string;
  label: string;
  /** Código IATA escolhido (`''` enquanto nada foi escolhido). */
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
  /** Ícone à esquerda dentro da caixa. */
  icon?: ReactNode;
  error?: string | null;
  className?: string;
}

const LIMITE_SUGESTOES = 8;

/**
 * Combobox de aeroporto: a pessoa digita a cidade e escolhe na lista, que
 * mostra só `UF-IATA`. Depois de escolhido, o campo exibe `SP-CGH` e o
 * formulário guarda só o código IATA.
 */
export function AirportField({
  id,
  label,
  value,
  onChange,
  placeholder,
  icon,
  error,
  className,
}: Props) {
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
    <Field htmlFor={id} label={label} error={error} className={className}>
      <div className="relative">
        <div className="entrada" data-erro={Boolean(error)}>
          {icon}
          <input
            id={id}
            role="combobox"
            aria-expanded={aberto}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-activedescendant={aberto ? `${id}-opcao-${ativo}` : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-erro` : undefined}
            autoComplete="off"
            value={pesquisando ? texto : codigo}
            placeholder={placeholder}
            onChange={(evento) => digitar(evento.target.value)}
            onKeyDown={teclar}
            onFocus={(evento) => evento.currentTarget.select()}
            onBlur={sair}
          />
        </div>
        {aberto && (
          <ul
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl border border-linha bg-white p-1.5 shadow-[0_12px_32px_rgb(101_53_75/0.12)]"
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
                    ? 'cursor-pointer rounded-xl bg-lilas px-3 py-2 text-sm font-bold tracking-[0.08em] text-roxo'
                    : 'cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold tracking-[0.08em] text-tinta hover:bg-rosado'
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
    </Field>
  );
}
