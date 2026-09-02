<#
.SYNOPSIS
    Starts the local production lab using Rootless Podman Compose or Docker Compose.
.DESCRIPTION
    Complies with Vigilio Super Senior Mode: Cloud-Neutral, Rootless Podman, RustFS, Keycloak.
#>
[CmdletBinding()]
param(
    [switch]$WithLLM,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployDir = Join-Path (Split-Path -Parent $ScriptDir) "enterprise-rag-deploy"

Push-Location $DeployDir
try {
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Copying .env.example to .env..."
        Copy-Item ".env.example" ".env"
    }

    $composeCmd = "podman"
    $composeArgs = @("compose")
    if (-not (Get-Command "podman" -ErrorAction SilentlyContinue)) {
        if (Get-Command "docker" -ErrorAction SilentlyContinue) {
            $composeCmd = "docker"
            $composeArgs = @("compose")
        } else {
            Write-Error "Neither podman nor docker is installed or found in PATH."
            return
        }
    }

    Write-Host "Verifying Compose configuration..." -ForegroundColor Cyan
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml config | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Compose configuration verification failed."
        return
    }

    Write-Host "Starting core services (PostgreSQL, Valkey, Keycloak, Mailpit, ClamAV, RustFS)..." -ForegroundColor Cyan
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml --profile development up -d postgres mailpit keycloak clamav valkey rustfs

    if ($WithLLM) {
        Write-Host "Starting Ollama service..." -ForegroundColor Cyan
        & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml --profile llm up -d ollama
    }

    Write-Host "Running database migrations and platform setup..." -ForegroundColor Cyan
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml --profile tools run --rm migrate
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml --profile tools run --rm platform-setup

    Write-Host "Starting application services (API, Outbox Relay, Worker, Web, Caddy)..." -ForegroundColor Cyan
    $appArgs = @("up", "-d")
    if ($Build) { $appArgs += "--build" }
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml @appArgs api outbox worker web caddy

    Write-Host "Enterprise RAG Platform started successfully." -ForegroundColor Green
    Write-Host "Edge Gateway: https://localhost or http://127.0.0.1:8080" -ForegroundColor Yellow
    Write-Host "Health check: http://127.0.0.1:8080/api/v1/health/ready" -ForegroundColor Yellow
} finally {
    Pop-Location
}
