---
description: Gerar doc de evidência .docx para um work item (com checagem de duplicata)
agent: ado-evidence
---

Para o work item **$1**:

1. Execute `node scripts/evidence/generate-doc.mjs $1 --dry-run` e mostre:
   - **Destino principal (Drive)** (`EVIDENCE_DRIVE_ROOT/ano/quarter`)
   - **Fallback local** (`.output/evidence/ano/quarter`, usado se EPERM)
   - Nome do arquivo e duplicatas no Drive e/ou localmente
2. Pergunte: *"Confirma que devo salvar em `{Drive/ano/quarter}`?"*
3. Se o usuário discordar da pasta, pare e oriente ajustar `EVIDENCE_YEAR` / `EVIDENCE_QUARTER` no `.env`.
4. Se já existir, não crie sem substituição explícita.
5. Pergunte se devo gerar o documento.
6. Se aprovar e **não existir**: `node scripts/evidence/generate-doc.mjs $1`
7. Se aprovar **substituir**: `node scripts/evidence/generate-doc.mjs $1 --force`
8. Informe o caminho final; se houve fallback, explique e oriente copiar para o Drive.

Se $1 estiver vazio, peça o ID da task.
