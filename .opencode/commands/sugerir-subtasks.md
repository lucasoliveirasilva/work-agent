---
description: Sugerir subtasks faltantes para um work item (sem criar no Azure)
agent: ado-subtasks
---

Para o work item **$1**:

1. Se $1 estiver vazio, peça o ID da task.
2. Execute `node scripts/subtasks/get-task.mjs $1` e liste subtasks **já existentes**.
3. Via MCP, leia descrição e critérios de aceite.
4. Sugira apenas subtasks **faltantes** — sem duplicar existentes.
5. Avalie sempre os padrões do time (se ausentes): testes unitários, publicação UAT, coleta de evidência, abertura GMUD, acompanhamento GMUD.
6. Inclua subtasks específicas da task quando fizer sentido.
7. **Não crie** nada sem aprovação explícita.
