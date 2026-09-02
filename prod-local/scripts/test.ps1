<#
.SYNOPSIS
    Runs automated local quality gates for Enterprise RAG Platform.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

Write-Host "=== 1. PREFLIGHT ENVIRONMENT CHECK ===" -ForegroundColor Cyan
node (Join-Path $ScriptDir "preflight.mjs")
if ($LASTEXITCODE -ne 0) { throw "Preflight check failed." }

Write-Host "`n=== 2. STATIC AUDIT & ARCHITECTURE INVARIANTS ===" -ForegroundColor Cyan
python (Join-Path $ScriptDir "static-audit.py")
if ($LASTEXITCODE -ne 0) { throw "Static audit failed." }

Write-Host "`n=== 3. BDD GHERKIN INVARIANTS RUNNER ===" -ForegroundColor Cyan
node (Join-Path $ScriptDir "bdd-runner.mjs")
if ($LASTEXITCODE -ne 0) { throw "BDD runner failed." }

Write-Host "`n=== 4. BACKEND VERIFICATION (enterprise-rag-impl) ===" -ForegroundColor Cyan
Push-Location (Join-Path $RootDir "apps/enterprise-rag-impl")
try {
    pnpm check
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm openapi:diff
} finally {
    Pop-Location
}

Write-Host "`n=== 5. FRONTEND VERIFICATION (enterprise-rag-web) ===" -ForegroundColor Cyan
Push-Location (Join-Path $RootDir "apps/enterprise-rag-web")
try {
    pnpm contracts:check
    pnpm check
    pnpm typecheck
    pnpm test
    pnpm build
} finally {
    Pop-Location
}

Write-Host "`n=== 6. PYTHON OFFLINE EVALUATION SUITE ===" -ForegroundColor Cyan
Push-Location $RootDir
try {
    python -m unittest discover -s evaluation/tests -p "test_*.py"
} finally {
    Pop-Location
}

Write-Host "`n>>> ALL AUTOMATED QUALITY GATES PASSED (EXIT 0) <<<" -ForegroundColor Green
