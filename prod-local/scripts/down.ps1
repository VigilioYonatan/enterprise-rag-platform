<#
.SYNOPSIS
    Stops the local production lab services.
#>
[CmdletBinding()]
param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployDir = Join-Path (Split-Path -Parent $ScriptDir) "enterprise-rag-deploy"

Push-Location $DeployDir
try {
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

    $downArgs = @("down")
    if ($Volumes) {
        $downArgs += "-v"
    }

    Write-Host "Stopping Enterprise RAG services..." -ForegroundColor Cyan
    & $composeCmd @composeArgs --env-file .env -f compose/compose.yaml @downArgs
    Write-Host "Services stopped." -ForegroundColor Green
} finally {
    Pop-Location
}
