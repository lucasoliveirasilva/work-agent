---
description: Fluxo completo — listar tasks abertas, sugerir subtasks faltantes e criar após aprovação
agent: ado-subtasks
---

Execute o módulo de **subtasks** no Azure DevOps:

1. Liste tasks abertas com `node scripts/subtasks/list-tasks.mjs` (inclui coluna **Subtasks**).
2. Mostre a tabela e pergunte qual task escolher.
3. Carregue contexto com `node scripts/subtasks/get-task.mjs <id>` e MCP (descrição, critérios).
4. Mostre subtasks **já existentes** e sugira apenas as **faltantes** — incluindo padrões do time (testes unitários, UAT, evidência, abertura/acompanhamento GMUD) se ainda não houver equivalente.
5. Peça aprovação explícita antes de criar.
6. Somente após aprovação, crie via MCP.
7. Confirme IDs e links das subtasks criadas.

Comece pela etapa 1.
