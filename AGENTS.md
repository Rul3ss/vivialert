# Agente

Regras para trabalhar neste repositório.

## 1. Solução mínima

Soluções mínimas e de baixa complexidade, fazendo exatamente o que se pede.
Nada além do pedido: sem abstração extra, sem dependência nova, sem refatorar
o que não foi mencionado.

## 2. Não executar o ambiente

Só alterar o código. Quem valida é o usuário.

Não rodar o ambiente: Docker/Compose, API, dev server do front, migrations,
banco. Também não rodar validações por conta própria (testes, typecheck,
build) — o usuário valida e devolve o resultado.
