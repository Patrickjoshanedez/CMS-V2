#!/usr/bin/env pwsh
# Reinstall plagiarism engine images with configurable CPU/GPU torch variant.
# Usage examples:
#   .\reinstall-plagiarism-images.ps1
#   $env:PLAGIARISM_TORCH_VARIANT='cu121'; $env:PLAGIARISM_GPU_REQUEST='all'; .\reinstall-plagiarism-images.ps1

$ErrorActionPreference = 'Stop'

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker compose @Args
        return
    }

    & docker-compose @Args
}

Write-Host 'Checking Docker daemon...' -ForegroundColor Yellow
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker is not running. Start Docker Desktop first.' -ForegroundColor Red
    exit 1
}

if (-not $env:PLAGIARISM_TORCH_VARIANT) {
    $env:PLAGIARISM_TORCH_VARIANT = 'cu121'
}
if (-not $env:PLAGIARISM_GPU_REQUEST) {
    $env:PLAGIARISM_GPU_REQUEST = 'all'
}

Write-Host "Reinstalling plagiarism images (TORCH_VARIANT=$($env:PLAGIARISM_TORCH_VARIANT), GPU=$($env:PLAGIARISM_GPU_REQUEST))..." -ForegroundColor Cyan

Invoke-Compose -Args @('stop', 'plagiarism_api', 'plagiarism_worker')
Invoke-Compose -Args @('rm', '-f', 'plagiarism_api', 'plagiarism_worker')
Invoke-Compose -Args @('build', '--no-cache', 'plagiarism_api', 'plagiarism_worker')
Invoke-Compose -Args @('up', '-d', 'plagiarism_redis', 'plagiarism_worker', 'plagiarism_api')
Invoke-Compose -Args @('ps', 'plagiarism_redis', 'plagiarism_worker', 'plagiarism_api')

Write-Host ''
Write-Host 'Done. Validate acceleration and limits with:' -ForegroundColor Green
Write-Host '  docker compose logs -f plagiarism_worker'
Write-Host '  docker compose exec plagiarism_worker python -c "import torch; print(torch.cuda.is_available(), torch.cuda.device_count())"'
