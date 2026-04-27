#!/usr/bin/env pwsh
# CMS V2 - All-in-One Startup Script (Windows PowerShell)
# This script starts ALL services including the plagiarism engine in one command.
# Pass -PublicExposure to launch the production stack with ngrok.

param(
    [switch]$PublicExposure
)

if ($PublicExposure) {
    $productionStartupScript = Join-Path $PSScriptRoot 'start-prod-test.ps1'
    if (-not (Test-Path $productionStartupScript)) {
        Write-Host 'Production startup script not found: start-prod-test.ps1' -ForegroundColor Red
        exit 1
    }

    Write-Host 'Public exposure requested; starting the production stack with ngrok...' -ForegroundColor Cyan
    & $productionStartupScript
    exit $LASTEXITCODE
}

Write-Host "Launching CMS V2 with integrated Plagiarism Engine..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}
Write-Host "Docker is running" -ForegroundColor Green
Write-Host ""

$composeArgs = @('-f', 'docker-compose.yml')

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & docker compose @composeArgs @Args
}

# Check if .env files exist
Write-Host "Checking configuration files..." -ForegroundColor Yellow

if (-Not (Test-Path "server\.env")) {
    Write-Host "server\.env not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "Created server\.env - Please configure it before production use" -ForegroundColor Green
}

if (-Not (Test-Path "plagiarism_engine\.env")) {
    Write-Host "plagiarism_engine\.env not found. Using defaults from docker-compose environment" -ForegroundColor Yellow
}

Write-Host ""

# Stop any existing containers
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
Invoke-Compose -Args @('down') 2>&1 | Out-Null
Write-Host "Existing containers stopped" -ForegroundColor Green
Write-Host ""

# Build and start all services
Write-Host "Building and starting all services..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on first run (downloading images and dependencies)..." -ForegroundColor Gray
Write-Host ""

Invoke-Compose -Args @('up', '--build', '-d')

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Service Status:" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Wait a moment for services to initialize
    Start-Sleep -Seconds 5
    
    Invoke-Compose -Args @('ps')
    
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Frontend (Vite):          http://localhost:43211" -ForegroundColor White
    Write-Host "   Backend API:              http://localhost:43210/api" -ForegroundColor White
    Write-Host "   API Health Check:         http://localhost:43210/api/health" -ForegroundColor White
    Write-Host "   Plagiarism Engine API:    http://localhost:8001" -ForegroundColor White
    Write-Host "   Plagiarism Health Check:  http://localhost:8001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Quick Tests:" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Test API health
    Write-Host "Testing CMS API..." -ForegroundColor Yellow
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:43210/api/health" -Method Get -TimeoutSec 5
        if ($apiResponse.success -eq $true) {
            Write-Host "CMS API is responding" -ForegroundColor Green
        }
    } catch {
        Write-Host "CMS API not ready yet (may still be initializing)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Testing Plagiarism Engine API..." -ForegroundColor Yellow
    try {
        $plagiarismResponse = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get -TimeoutSec 5
        Write-Host "Plagiarism Engine API is responding" -ForegroundColor Green
    } catch {
        Write-Host "Plagiarism Engine not ready yet (may be downloading ML models on first run)" -ForegroundColor Yellow
        Write-Host "This is normal. Check logs: docker compose -f docker-compose.yml logs plagiarism_api" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Useful Commands:" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   View logs (all):          docker compose -f docker-compose.yml logs -f" -ForegroundColor White
    Write-Host "   View logs (CMS server):   docker compose -f docker-compose.yml logs -f server" -ForegroundColor White
    Write-Host "   View logs (Plagiarism):   docker compose -f docker-compose.yml logs -f plagiarism_api" -ForegroundColor White
    Write-Host "   Stop all services:        docker compose -f docker-compose.yml down" -ForegroundColor White
    Write-Host "   Restart a service:        docker compose -f docker-compose.yml restart SERVICE_NAME" -ForegroundColor White
    Write-Host "   View running containers:  docker compose -f docker-compose.yml ps" -ForegroundColor White
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "Setup complete! Your CMS is ready to use." -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to start services. Check the logs:" -ForegroundColor Red
    Write-Host "   docker compose -f docker-compose.yml logs" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
