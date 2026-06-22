---
description: Fluxo completo — listar tasks, confirmar pasta ano/quarter e gerar doc .docx
agent: ado-evidence
---

Execute o módulo de **documentos de evidência**:

1. Liste minhas tasks em desenvolvimento, review ou PR com `node scripts/evidence/list-tasks.mjs`.
2. Mostre a tabela e pergunte qual task escolher.
3. Faça dry-run com `node scripts/evidence/generate-doc.mjs <id> --dry-run`.
4. Mostre **destino principal (Drive)** e **fallback local**; peça confirmação da pasta no Drive.
5. Se o arquivo já existir (Drive ou local), informe e não crie — pergunte se deseja substituir.
6. Peça aprovação para gerar o documento.
7. Somente após confirmar pasta + criação:
   - novo: `node scripts/evidence/generate-doc.mjs <id>`
   - substituir: `node scripts/evidence/generate-doc.mjs <id> --force`
8. Informe o caminho final; se houve **fallback (EPERM)**, avise que ficou em `.output/evidence` e oriente copiar para o Drive.

Comece pela etapa 1.
