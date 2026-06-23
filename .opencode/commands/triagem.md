---
description: Triagem de status — ADO + GitHub, tabela de sugestões e aplicação com aprovação
agent: ado-github-triage
---

Execute o módulo de **triagem de status**:

1. Rode `node scripts/triage/analyze.mjs --save`.
2. Mostre a tabela completa (ID, estado atual, sugerido, mudar?, match, título).
3. Detalhe as mudanças sugeridas (motivo, PRs, tipo de match).
4. Pergunte quais tasks devo atualizar (IDs específicos ou todas as marcadas).
5. Somente após aprovação explícita:
   - `node scripts/triage/apply.mjs --plan <caminho-do-plano> --ids <ids>`
   - ou `--all` se o usuário aprovar todas
6. Informe o resultado de cada atualização no Azure DevOps.

Comece pela etapa 1.
