import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Em desenvolvimento o browser fala só com o Vite, que repassa as rotas
      // da API: mesma origem, sem CORS no caminho.
      '/alerts': 'http://localhost:3000',
      '/airports': 'http://localhost:3000',
    },
  },
});
