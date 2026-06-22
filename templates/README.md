# Template Word — placeholders docxtemplater

Arquivo: `evidencia.template.docx`  
Delimitadores: `[[NOME]]` (compatível com export Google Docs → Word)

| Placeholder | Origem |
|-------------|--------|
| `[[CABECALHO]]` | `{Tipo} {ID}: {Título}` — ex.: User Story 170349: [Back] API… |
| `[[SQUAD]]` | Time (`AZDO_TEAM`) ou Area Path |
| `[[QUARTER_LABEL]]` | Quarter atual (ex.: `Q2 / 2026`) |
| `[[RESPONSAVEL]]` | Assignee |
| `[[TIPO_TESTE]]` | Derivado do título: `[Back]`→Backend, `[Front]`→Frontend |
| `[[AMBIENTE_TESTE]]` | `.env` → `EVIDENCE_AMBIENTE_TESTE` (padrão: UAT) |
| `[[VERSAO_TESTES]]` | *(vazio — preencher manualmente no doc)* |
| `[[URL_TASK]]` | Link no Azure DevOps |
| `[[FUNCIONALIDADE]]` | *(vazio — preencher manualmente no doc)* |

Reaplicar placeholders após editar o `.docx` manualmente:

```powershell
node scripts/patch-evidence-template.mjs
```
