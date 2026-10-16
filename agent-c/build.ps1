# CloudRDR C Engine & Agent Compilation Script for Windows
$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot "bin"
if (!(Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$coreSrc = @(
    (Join-Path $PSScriptRoot "src/cloudrdr_sha256.c"),
    (Join-Path $PSScriptRoot "src/cloudrdr_entropy.c"),
    (Join-Path $PSScriptRoot "src/cloudrdr_canary.c"),
    (Join-Path $PSScriptRoot "src/cloudrdr_detector.c"),
    (Join-Path $PSScriptRoot "src/cloudrdr_merkle.c")
)

$includeDir = Join-Path $PSScriptRoot "include"

Write-Host "[*] Compiling cloudrdr-agent.exe..." -ForegroundColor Cyan
& gcc -O3 -Wall -Wextra -std=c11 -I$includeDir -o (Join-Path $binDir "cloudrdr-agent.exe") (Join-Path $PSScriptRoot "src/agent.c") $coreSrc -lws2_32 -lm

Write-Host "[*] Compiling cloudrdr-entropy.exe..." -ForegroundColor Cyan
& gcc -O3 -Wall -Wextra -std=c11 -I$includeDir -o (Join-Path $binDir "cloudrdr-entropy.exe") (Join-Path $PSScriptRoot "src/cli_entropy.c") (Join-Path $PSScriptRoot "src/cloudrdr_entropy.c") -lm

Write-Host "[*] Compiling cloudrdr-merkle.exe..." -ForegroundColor Cyan
& gcc -O3 -Wall -Wextra -std=c11 -I$includeDir -o (Join-Path $binDir "cloudrdr-merkle.exe") (Join-Path $PSScriptRoot "src/cli_merkle.c") (Join-Path $PSScriptRoot "src/cloudrdr_merkle.c") (Join-Path $PSScriptRoot "src/cloudrdr_sha256.c") -lm

Write-Host "[OK] All CloudRDR C binaries compiled successfully into $binDir" -ForegroundColor Green
