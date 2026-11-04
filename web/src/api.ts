import type {
  Airport,
  Alert,
  CheckResult,
  CreateAlertInput,
  PricePoint,
  UpdateAlertInput,
  WatchStatus,
} from './types';

/**
 * Vazio em dev: o proxy do Vite repassa /alerts para a API (mesma origem).
 * Em produção defina VITE_API_URL com a URL pública da API.
 */
const BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Chave de acesso da API. Vai no build do frontend (defina `VITE_API_KEY`),
 * então não é segredo forte — é o que impede que qualquer um que descubra a
 * URL consiga apagar o alerta ou queimar a cota do provedor de preço.
 */
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

interface CorpoDeErro {
  message?: string | string[];
}

async function mensagemDeErro(response: Response): Promise<string> {
  try {
    const corpo = (await response.json()) as CorpoDeErro;
    const mensagem = Array.isArray(corpo.message)
      ? corpo.message[0]
      : corpo.message;
    if (mensagem) {
      return mensagem;
    }
  } catch {
    // corpo não é JSON (proxy fora do ar, erro de gateway...)
  }
  if (response.status === 401) {
    return 'Chave de API ausente ou inválida. Confira VITE_API_KEY.';
  }
  if (response.status === 502 || response.status === 504) {
    return 'API fora do ar. Ela está rodando em http://localhost:3000?';
  }
  return `Falha na requisição (HTTP ${response.status}).`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Não foi possível falar com a API em ${BASE || '/'}.`);
  }

  if (!response.ok) {
    throw new Error(await mensagemDeErro(response));
  }

  /**
   * Corpo vazio é uma resposta legítima, não um erro:
   * - `DELETE /alerts/:id` responde 204 sem corpo;
   * - o Nest envia **200 com corpo vazio** quando o controller devolve `null`,
   *   e é o caso de `GET /alerts` quando ainda não existe alerta.
   *
   * Chamar `response.json()` direto estourava "Unexpected end of JSON input".
   * Devolvemos `null` (e não `undefined`) porque as telas comparam com `null`
   * para decidir se mostram o estado vazio.
   */
  const texto = await response.text();
  if (!texto.trim()) {
    return null as T;
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(
      `A API respondeu algo que não é JSON (HTTP ${response.status}).`,
    );
  }
}

/** O alerta único, ou `null` se ainda não existe. */
export async function getAlert(): Promise<Alert | null> {
  const { alert } = await request<{ alert: Alert | null }>('/alerts');
  return alert;
}

export function getAlertById(id: string): Promise<Alert> {
  return request<Alert>(`/alerts/${encodeURIComponent(id)}`);
}

export function createAlert(input: CreateAlertInput): Promise<Alert> {
  return request<Alert>('/alerts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAlert(
  id: string,
  input: UpdateAlertInput,
): Promise<Alert> {
  return request<Alert>(`/alerts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteAlert(id: string): Promise<void> {
  return request<void>(`/alerts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function checkPrice(id: string): Promise<CheckResult> {
  return request<CheckResult>(`/alerts/${encodeURIComponent(id)}/check`, {
    method: 'POST',
  });
}

export function listPrices(id: string): Promise<PricePoint[]> {
  return request<PricePoint[]>(`/alerts/${encodeURIComponent(id)}/prices`);
}

export function getWatchStatus(): Promise<WatchStatus> {
  return request<WatchStatus>('/watch/status');
}

/** Lista estática de aeroportos brasileiros, servida pela API. */
export function listAirports(): Promise<Airport[]> {
  return request<Airport[]>('/airports');
}
