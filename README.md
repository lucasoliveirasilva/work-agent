# Work Agent

Agente local de **automação do fluxo de trabalho**, construído com [OpenCode](https://opencode.ai) e integrações via MCP.

O objetivo do projeto é centralizar rotinas do dia a dia — leitura de boards, preparação de work items, triagem e outras ações repetitivas — com IA assistindo e **sempre pedindo aprovação** antes de alterar algo em sistemas externos.

Hoje o foco inicial é o **Azure DevOps**, mas a arquitetura foi pensada para **acumular módulos** ao longo do tempo (novos commands, agentes e integrações sem reestruturar o projeto).

## Visão geral

```
Work Agent (OpenCode)
    │
    ├── Módulos disponíveis          ← commands em .opencode/commands/
    │      ├── subtasks              quebra de tasks em subtasks
    │      ├── listar-tasks          listagem de tasks sem filhos
    │      ├── sugerir-subtasks      sugestão de subtasks
    │      ├── evidencia             doc de evidência (fluxo completo)
    │      ├── listar-tasks-dev      tasks em dev/review/PR
    │      └── gerar-evidencia       gera doc para um ID
    │
    ├── Agentes                      ← .opencode/agents/
    │      ├── ado-subtasks          subtasks no Azure DevOps
    │      └── ado-evidence          documentos de evidência
    │
    └── Integrações (MCP)
           └── azure-devops          Microsoft @azure-devops/mcp
```

Cada **módulo** é um command (`/nome-do-modulo`) com prompt e comportamento próprios. Novos módulos entram como arquivos em `.opencode/commands/` — e, quando necessário, agentes dedicados em `.opencode/agents/`.

## Módulos disponíveis

### Azure DevOps — Subtasks

Automatiza a quebra de work items em subtasks com apoio da IA.

| Módulo | Command | Descrição |
|--------|---------|-----------|
| **Subtasks (fluxo completo)** | `/subtasks` | Lista tasks suas sem subtasks → você escolhe → IA sugere → pede aprovação → cria no Azure |
| **Listar tasks** | `/listar-tasks` | Apenas lista work items atribuídos a você que ainda não têm filhos |
| **Sugerir subtasks** | `/sugerir-subtasks <id>` | Analisa um work item e propõe subtasks **sem criar** nada no Azure |

Fluxo típico do módulo `/subtasks`:

1. Buscar tasks no board sem subtasks criadas
2. Exibir lista numerada para escolha
3. Analisar descrição e contexto da task selecionada
4. Sugerir subtasks práticas
5. Criar no Azure DevOps somente após aprovação explícita

### Azure DevOps — Documentos de Evidência

Gera docs de evidência a partir de tasks em andamento, preenchendo um template com dados extraídos do Azure DevOps e salvando na pasta do Drive em **`{root}/{ano}/{quarter}`** (ex.: `...\Evidências\2026\Q2`).

| Módulo | Command | Descrição |
|--------|---------|-----------|
| **Evidência (fluxo completo)** | `/evidencia` | Lista tasks em dev/review → escolhe → pré-visualiza → aprova → cria doc no Drive |
| **Listar tasks em andamento** | `/listar-tasks-dev` | Só lista work items ativos (desenvolvimento, review, PR…) |
| **Gerar evidência** | `/gerar-evidencia <id>` | Gera doc para um work item específico (com dry-run antes) |

Fluxo típico do módulo `/evidencia`:

1. Buscar tasks suas em estados de andamento (configurável)
2. Exibir lista numerada para escolha
3. Extrair da task: URL, título, responsável, estado, descrição, PRs vinculados…
4. Pré-visualizar documento, **destino no Drive (ano/quarter)** e **fallback local**
5. Confirmar a pasta de destino com o usuário antes de criar
6. Tentar gravar no Drive; se EPERM, gerar em `.output/evidence/` e sinalizar

**Nomenclatura:** `User Story 170349 - [Back] Título da task.docx`  
(padrão `{Tipo} {ID} - {Título}` — o `:` após o ID vira ` - ` no Windows)

**Template:** `templates/evidencia.template.docx` com placeholders `[[CABECALHO]]`, `[[URL_TASK]]`, etc. (veja `templates/README.md`)

Scripts CLI (sem OpenCode):

```powershell
npm run evidence:list
npm run evidence:generate -- 12345 --dry-run
npm run evidence:generate -- 12345
```

### Próximos módulos (planejado)

Espaço reservado para evoluções do fluxo de trabalho, por exemplo:

- Triagem de PRs vinculados a work items
- Resumo de sprint / status de itens em risco
- Upload direto via Google Drive MCP (sem pasta sincronizada)

> Para adicionar um módulo: crie `.opencode/commands/<nome>.md` com frontmatter (`description`, `agent`) e o prompt do fluxo.

## Pré-requisitos

- [OpenCode](https://opencode.ai) instalado (`opencode --version`)
- [Node.js](https://nodejs.org) 20+
- PAT do Azure DevOps com escopo **Work Items (Read & Write)**
- Provedor de LLM configurado (ex.: ChatGPT Plus via `opencode auth login`)

> **Nota:** funciona com **Azure DevOps Services** (`dev.azure.com`) e **Azure DevOps Server** on-premises. O MCP local com PAT é o método recomendado para clientes como o OpenCode.

## Configuração

```powershell
git clone <url-do-repo> work-agent
cd work-agent

npm install

copy .env.example .env
# Edite .env com org, projeto, time e PAT reais
```

Atualize também o nome da organização em `opencode.json` (argumento do comando MCP, ex.: `"contoso"`) e os campos `ado_mcp_project` / `ado_mcp_team` para bater com o seu `.env`.

### Autenticação LLM (ChatGPT Plus/Pro)

```powershell
opencode auth login
# OpenAI → ChatGPT Plus/Pro
```

Use modelos compatíveis com assinatura ChatGPT, como `openai/gpt-5.4`. Evite `gpt-5.3-codex-spark` — não funciona com login via conta ChatGPT.

### Variáveis do `.env`

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `AZDO_PAT` | Personal Access Token | `xxxxxxxx...` |
| `AZDO_ORG` | Nome curto da organização | `contoso` |
| `AZDO_ORG_URL` | URL da org (opcional) | `https://dev.azure.com/contoso` |
| `AZDO_PROJECT` | Projeto padrão | `Fabrikam` |
| `AZDO_TEAM` | Time padrão | `Fabrikam Team` |
| `EVIDENCE_DRIVE_ROOT` | Pasta principal no Drive (`/ano/quarter`) | `G:/Drives compartilhados/.../Evidencias` |
| `EVIDENCE_OUTPUT_ROOT` | Fallback local se EPERM (opcional) | `.output/evidence` |
| `EVIDENCE_TEMPLATE_PATH` | Template Word | `templates/evidencia.template.docx` |
| `EVIDENCE_AMBIENTE_TESTE` | Ambiente no doc (opcional) | `UAT` |
| `EVIDENCE_YEAR` | Override do ano (opcional) | `2026` |
| `EVIDENCE_QUARTER` | Override do quarter (opcional) | `Q2` |
| `EVIDENCE_ACTIVE_STATES` | Estados "em andamento" (opcional) | `Active,In Progress,In Review` |

O script `load-env.ps1` converte o PAT para o formato exigido pelo MCP (`PERSONAL_ACCESS_TOKEN` em base64).

## Como usar

### Iniciar o agente

```powershell
.\scripts\start.ps1
```

Carrega o `.env`, garante dependências e abre o OpenCode no projeto.

### Executar um módulo

No TUI, digite o command do módulo desejado:

```
/subtasks
/evidencia
/listar-tasks-dev
/gerar-evidencia 12345
```

Use **Tab** para alternar entre agentes (`ado-subtasks`, `ado-evidence`) ou especifique o agente no command. Troque o modelo com `/models` se necessário.

### Validar integração MCP

```powershell
.\scripts\test-mcp.ps1
```

Deve exibir `azure-devops connected`.

## Estrutura do projeto

```
work-agent/
├── opencode.json              # Config global: MCP, modelo, agente padrão
├── package.json               # Dependência @azure-devops/mcp
├── .env                       # Credenciais (não commitar)
├── .env.example
├── config/
│   └── evidence.json          # Estados e padrões do módulo evidência
├── templates/
│   ├── evidencia.template.docx
│   └── README.md
├── lib/
│   ├── ado-client.mjs         # Cliente REST Azure DevOps
│   └── evidence/              # Geração de docs
├── .opencode/
│   ├── agents/
│   │   ├── ado-subtasks.md
│   │   └── ado-evidence.md
│   └── commands/
│       ├── subtasks.md
│       ├── listar-tasks.md
│       ├── sugerir-subtasks.md
│       ├── evidencia.md
│       ├── listar-tasks-dev.md
│       └── gerar-evidencia.md
└── scripts/
    ├── evidence/
    │   ├── list-tasks.mjs
    │   └── generate-doc.mjs
    ├── load-env.ps1
    ├── start.ps1
    └── test-mcp.ps1
```

## Arquitetura técnica

```
OpenCode (TUI)
    │
    ├── Agente ado-subtasks
    │      ├── Orquestra módulos de work items
    │      ├── Raciocina sobre descrições e contexto
    │      └── Exige aprovação antes de escrita
    │
    └── MCP azure-devops
           ├── Leitura: my_work_items, get_work_item, query_by_wiql
           └── Escrita: add_child_work_items (com confirmação)
```

Ferramentas de **criação e alteração** no Azure DevOps usam permissão `ask` — o OpenCode solicita confirmação antes de executar.

## Personalização

Após clonar o repositório, ajuste:

1. **`.env`** — credenciais e nomes reais da sua org/projeto/time
2. **`opencode.json`** — org no array `command` do MCP e defaults em `environment`
3. **`.opencode/agents/`** — prompts dos agentes, se quiser regras específicas do seu processo

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `No MCP servers configured` | Rode a partir da pasta do projeto ou use `.\scripts\start.ps1` |
| Erro de autenticação Azure | Verifique PAT, escopos e se `AZDO_ORG` bate com `opencode.json` |
| Modelo não suportado (ChatGPT) | Troque em `/models` para `openai/gpt-5.4` ou similar |
| MCP lento na 1ª vez | Aguarde o `npm install`; o binário local evita timeout do `npx` |
| Criação bloqueada | Aprove no chat e confirme o popup do OpenCode |
| Time/projeto errado | Ajuste `.env` e `opencode.json` → `mcp.azure-devops.environment` |
| Lista de evidência vazia | Ajuste estados em `config/evidence.json` ou `EVIDENCE_ACTIVE_STATES` |
| `EVIDENCE_DRIVE_ROOT não configurado` | Defina a pasta de referência do Drive no `.env` |
| `EPERM` ao salvar | Fallback automático para `.output/evidence/` — copie manualmente para o Drive |
| Arquivo já existe | Normal — use `--force` só se quiser substituir |
| Template docx não preenche | Confirme placeholders `{{CAMPO}}` — veja `templates/README.md` |

## Segurança

- **Nunca** commite o `.env`
- Rotacione o PAT se ele foi exposto
- Credenciais ficam apenas em variáveis de ambiente do processo local
- Módulos que alteram sistemas externos sempre passam por aprovação humana
