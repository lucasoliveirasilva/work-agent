# Inicia o OpenCode com variáveis do .env carregadas.
# Uso: .\scripts\start.ps1

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\load-env.ps1"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$nodeModules = Join-Path $projectRoot "node_modules\@azure-devops\mcp"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Instalando dependências (npm install)..." -ForegroundColor Yellow
    npm install
}

Write-Host "Iniciando OpenCode no projeto work-agent..." -ForegroundColor Cyan
Write-Host "Comandos disponíveis: /subtasks | /listar-tasks | /sugerir-subtasks <id>" -ForegroundColor DarkGray

opencode @args
