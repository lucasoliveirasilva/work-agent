# Carrega variáveis do .env e prepara autenticação PAT para o MCP Azure DevOps.
# Uso: . .\scripts\load-env.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path $envFile)) {
    throw "Arquivo .env não encontrado em $projectRoot. Copie .env.example para .env e preencha os valores."
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) { return }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

if (-not $env:AZDO_PAT) {
    throw "AZDO_PAT não definido no .env"
}

# Extrai organização da URL se AZDO_ORG não estiver definido
if (-not $env:AZDO_ORG -and $env:AZDO_ORG_URL) {
    if ($env:AZDO_ORG_URL -match 'https?://([^.]+)\.visualstudio\.com') {
        $env:AZDO_ORG = $Matches[1]
    } elseif ($env:AZDO_ORG_URL -match 'dev\.azure\.com/([^/]+)') {
        $env:AZDO_ORG = $Matches[1]
    }
}

# MCP Azure DevOps exige PAT em base64 no formato ":<token>"
$patBytes = [Text.Encoding]::UTF8.GetBytes(":$($env:AZDO_PAT)")
$env:PERSONAL_ACCESS_TOKEN = [Convert]::ToBase64String($patBytes)

# Defaults do MCP (usados pelo servidor @azure-devops/mcp)
if ($env:AZDO_PROJECT) {
    $env:ado_mcp_project = $env:AZDO_PROJECT
}
if ($env:AZDO_TEAM) {
    $env:ado_mcp_team = $env:AZDO_TEAM
}

Write-Host "Ambiente carregado: org=$($env:AZDO_ORG), projeto=$($env:AZDO_PROJECT), time=$($env:AZDO_TEAM)" -ForegroundColor Green
