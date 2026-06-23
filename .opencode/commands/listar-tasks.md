---
description: Listar tasks abertas atribuídas a mim com contagem de subtasks
agent: ado-subtasks
---

Execute `node scripts/subtasks/list-tasks.mjs` e exiba a tabela com: #, ID, Tipo, Estado, **Subtasks** (quantidade), Título.

Não sugira nem crie subtasks — apenas a listagem.
Se vazia, oriente ajustar `config/subtasks.json` ou `SUBTASKS_ACTIVE_STATES`.
