# Valida conexão com Azure DevOps via MCP (requer .env configurado).
# Uso: .\scripts\test-mcp.ps1

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\load-env.ps1"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Verificando servidores MCP configurados..." -ForegroundColor Cyan
opencode mcp list

Write-Host ""
Write-Host "Testando listagem de projetos (pode levar alguns segundos na primeira execução)..." -ForegroundColor Cyan
opencode run --agent ado-subtasks "Use as ferramentas azure-devops para listar os projetos da organização. Responda apenas com os nomes encontrados."
