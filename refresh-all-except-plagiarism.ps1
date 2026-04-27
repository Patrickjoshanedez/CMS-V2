#!/usr/bin/env pwsh
# Refresh CMS Docker stack without plagiarism services/images.
# Starts: mongodb, redis, localstack, server, client
# Skips: plagiarism_redis, plagiarism_worker, plagiarism_api

$ErrorActionPreference = 'Stop'
$composeArgs = @('-f', 'docker-compose.yml')

Write-Host 'Refreshing CMS stack (excluding plagiarism checker)...' -ForegroundColor Cyan

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker compose @composeArgs @Args
        return
    }

    & docker-compose @composeArgs @Args
}

Write-Host 'Checking Docker daemon...' -ForegroundColor Yellow
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker is not running. Start Docker Desktop first.' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path 'server/.env')) {
    Write-Host 'server/.env not found. Creating from server/.env.example...' -ForegroundColor Yellow
    Copy-Item 'server/.env.example' 'server/.env'
}

Write-Host 'Stopping existing CMS containers...' -ForegroundColor Yellow
Invoke-Compose -Args @('down', '--remove-orphans')

Write-Host 'Starting infrastructure (mongodb, redis, localstack)...' -ForegroundColor Yellow
Invoke-Compose -Args @('up', '-d', 'mongodb', 'redis', 'localstack')

Write-Host 'Building and starting app services (server, client) without plagiarism deps...' -ForegroundColor Yellow
Invoke-Compose -Args @('up', '--build', '-d', '--no-deps', 'server', 'client')

Write-Host ''
Write-Host 'Services started (without plagiarism checker):' -ForegroundColor Green
Invoke-Compose -Args @('ps')

Write-Host ''
Write-Host 'URLs:' -ForegroundColor Cyan
Write-Host '  Frontend:  http://localhost:43211'
Write-Host '  Backend:   http://localhost:43210/api'
Write-Host '  Health:    http://localhost:43210/api/health'
Write-Host ''
Write-Host 'Notes:' -ForegroundColor Cyan
Write-Host '  - Plagiarism services are intentionally excluded.'
Write-Host '  - Start them separately with: docker compose -f docker-compose.yml up -d plagiarism_redis plagiarism_worker plagiarism_api'
