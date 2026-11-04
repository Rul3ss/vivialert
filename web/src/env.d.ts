/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública da API. Vazio em dev (o proxy do Vite cuida disso). */
  readonly VITE_API_URL?: string;
  /** Chave de acesso da API (`API_KEY` no backend). */
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
