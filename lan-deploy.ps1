<#
.SYNOPSIS
    CMS V2 — Automated LAN Deployment Script

.DESCRIPTION
    Builds and deploys the CMS V2 Capstone Management System on your local
    network so classmates on the same Wi-Fi / LAN can access it from their
    browsers.

    The script:
      1. Detects your local LAN IP address
      2. Creates / updates .env.prod with the correct CLIENT_URL for CORS
      3. Opens Windows Firewall port 8080 (requires Run as Administrator)
      4. Builds and starts the production Docker containers
      5. Waits for a health-check, then prints the access URL

.PARAMETER Stop
    Stop the running LAN deployment and remove firewall rules.

.PARAMETER Clean
    Stop containers, remove Docker volumes, AND remove firewall rules.

.PARAMETER SkipBuild
    Start containers without rebuilding images (faster restarts).

.PARAMETER Port
    Host port for the web app (default: 8080).

.EXAMPLE
    # First-time deploy (builds everything)
    .\lan-deploy.ps1

.EXAMPLE
    # Restart without rebuilding
    .\lan-deploy.ps1 -SkipBuild

.EXAMPLE
    # Shut down and clean up
    .\lan-deploy.ps1 -Stop

.EXAMPLE
    # Full cleanup (removes database volumes too)
    .\lan-deploy.ps1 -Clean
#>

param(
    [switch]$Stop,
    [switch]$Clean,
    [switch]$SkipBuild,
    [int]$Port = 8080
)

# ─── Strict Mode ────────────────────────────────────────────────────────────
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── Constants ──────────────────────────────────────────────────────────────
$COMPOSE_FILE      = 'docker-compose.prod.yml'
$COMPOSE_OVERRIDE  = 'docker-compose.lan.yml'
$ENV_EXAMPLE       = '.env.prod.example'
$ENV_FILE          = '.env.prod'
$FW_RULE_NAME      = 'CMS-V2-LAN'
$PROJECT_NAME      = 'cms-v2-lan'
$HEALTH_TIMEOUT    = 120   # seconds to wait for containers
$HEALTH_INTERVAL   = 3     # seconds between health checks

# ─── Helpers ────────────────────────────────────────────────────────────────

function Write-Banner {
    param([string]$Text)
    $line = '─' * 60
    Write-Host ""
    Write-Host "  $line" -ForegroundColor Cyan
    Write-Host "    $Text" -ForegroundColor White
    Write-Host "  $line" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([int]$Num, [string]$Text)
    Write-Host "  [$Num] " -ForegroundColor Yellow -NoNewline
    Write-Host $Text -ForegroundColor White
}

function Write-Ok {
    param([string]$Text)
    Write-Host "   ✓ " -ForegroundColor Green -NoNewline
    Write-Host $Text
}

function Write-Warn {
    param([string]$Text)
    Write-Host "   ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Text
}

function Write-Err {
    param([string]$Text)
    Write-Host "   ✗ " -ForegroundColor Red -NoNewline
    Write-Host $Text
}

function Test-IsAdmin {
    $principal = New-Object Security.Principal.WindowsPrincipal(
        [Security.Principal.WindowsIdentity]::GetCurrent()
    )
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-LanIP {
    # Exclude virtual/loopback adapters (WSL, VirtualBox, VMware, Hyper-V, etc.)
    $virtualPattern = 'WSL|vEthernet|VirtualBox|VMware|Virtual|Hyper-V|Loopback|Bluetooth|Teredo|isatap|6to4'

    $adapters = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -ne '127.0.0.1' -and
            $_.PrefixOrigin -ne 'WellKnown' -and
            $_.AddressState -eq 'Preferred' -and
            $_.InterfaceAlias -notmatch $virtualPattern
        } |
        Sort-Object -Property InterfaceIndex

    if ($adapters.Count -eq 0) {
        Write-Err "No physical LAN adapter found. Are you connected to Wi-Fi or Ethernet?"
        exit 1
    }

    # Prefer Wi-Fi adapter first, then any 192.168/10.x/172.16-31 range
    $lanIP = $adapters | Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless|WLAN' } |
        Select-Object -First 1

    if (-not $lanIP) {
        $lanIP = $adapters | Where-Object {
            $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
        } | Select-Object -First 1
    }

    if (-not $lanIP) {
        $lanIP = $adapters | Select-Object -First 1
    }

    return $lanIP.IPAddress
}

function Add-FirewallRule {
    param([int]$RulePort)
    if (-not (Test-IsAdmin)) {
        Write-Warn "Not running as Administrator — cannot add firewall rule."
        Write-Warn "Run PowerShell as Admin, or manually allow port $RulePort."
        return $false
    }

    # Remove existing rule if present, then create fresh
    $existing = Get-NetFirewallRule -DisplayName $FW_RULE_NAME -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $FW_RULE_NAME -ErrorAction SilentlyContinue
    }

    New-NetFirewallRule `
        -DisplayName $FW_RULE_NAME `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $RulePort `
        -Action Allow `
        -Profile Private, Domain `
        -Description "Allow LAN access to CMS V2 (port $RulePort)" | Out-Null

    Write-Ok "Firewall rule '$FW_RULE_NAME' created for port $RulePort (Private + Domain networks)."
    return $true
}

function Remove-FirewallRule {
    if (-not (Test-IsAdmin)) {
        Write-Warn "Not running as Administrator — cannot remove firewall rule."
        return
    }
    $existing = Get-NetFirewallRule -DisplayName $FW_RULE_NAME -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-NetFirewallRule -DisplayName $FW_RULE_NAME -ErrorAction SilentlyContinue
        Write-Ok "Firewall rule '$FW_RULE_NAME' removed."
    } else {
        Write-Ok "No firewall rule to remove."
    }
}

function Wait-ForHealth {
    param([string]$Url, [int]$Timeout, [int]$Interval)
    $elapsed = 0
    Write-Host "   Waiting for $Url ..." -NoNewline
    while ($elapsed -lt $Timeout) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host " UP!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Server not ready yet
        }
        Start-Sleep -Seconds $Interval
        $elapsed += $Interval
        Write-Host "." -NoNewline
    }
    Write-Host " TIMEOUT" -ForegroundColor Red
    return $false
}

# ─── Pre-flight Checks ─────────────────────────────────────────────────────

# Must be in project root
if (-not (Test-Path $COMPOSE_FILE)) {
    Write-Err "Cannot find '$COMPOSE_FILE'. Run this script from the CMS V2 project root."
    exit 1
}

# Docker must be running
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Err "Docker is not running. Start Docker Desktop and try again."
    exit 1
}

# ─── STOP Mode ──────────────────────────────────────────────────────────────

if ($Stop -or $Clean) {
    Write-Banner "Stopping CMS V2 LAN Deployment"

    Write-Step 1 "Stopping containers..."
    if ($Clean) {
        docker compose --env-file $ENV_FILE -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE -p $PROJECT_NAME down -v 2>$null
        Write-Ok "Containers stopped and volumes removed."
    } else {
        docker compose --env-file $ENV_FILE -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE -p $PROJECT_NAME down 2>$null
        Write-Ok "Containers stopped (data volumes preserved)."
    }

    Write-Step 2 "Removing firewall rule..."
    Remove-FirewallRule

    # Clean up the override file
    if (Test-Path $COMPOSE_OVERRIDE) {
        Remove-Item $COMPOSE_OVERRIDE -Force
        Write-Ok "Removed $COMPOSE_OVERRIDE"
    }

    Write-Banner "LAN deployment stopped."
    exit 0
}

# ─── DEPLOY Mode ────────────────────────────────────────────────────────────

Write-Banner "CMS V2 — LAN Deployment"

# Step 1: Detect LAN IP
Write-Step 1 "Detecting LAN IP address..."
$lanIP = Get-LanIP
Write-Ok "Your LAN IP: $lanIP"

# Step 2: Prepare .env.prod
Write-Step 2 "Preparing environment file (.env.prod)..."
if (-not (Test-Path $ENV_FILE)) {
    if (Test-Path $ENV_EXAMPLE) {
        Copy-Item $ENV_EXAMPLE $ENV_FILE
        Write-Ok "Created $ENV_FILE from $ENV_EXAMPLE"
    } else {
        Write-Err "Missing $ENV_EXAMPLE. Cannot create environment file."
        exit 1
    }
}

# Update CLIENT_URL to use LAN IP
$envContent = Get-Content $ENV_FILE -Raw
$newClientUrl = "CLIENT_URL=http://${lanIP}:${Port}"

if ($envContent -match 'CLIENT_URL=.*') {
    $envContent = $envContent -replace 'CLIENT_URL=.*', $newClientUrl
} else {
    $envContent += "`n$newClientUrl`n"
}
Set-Content -Path $ENV_FILE -Value $envContent -NoNewline
Write-Ok "Set CLIENT_URL=$( "http://${lanIP}:${Port}" )"

# Step 3: Generate docker-compose LAN override
Write-Step 3 "Generating LAN compose override..."

$overrideContent = @"
# Auto-generated by lan-deploy.ps1 - do not edit manually
# LAN IP: $lanIP | Port: $Port
services:
  mongodb:
    container_name: cms-mongodb-lan

  redis:
    container_name: cms-redis-lan

  server:
    container_name: cms-server-lan
    environment:
      CLIENT_URL: http://${lanIP}:${Port}

  client:
    container_name: cms-client-lan
    ports:
      - "${Port}:80"
"@

Set-Content -Path $COMPOSE_OVERRIDE -Value $overrideContent -Encoding UTF8
Write-Ok "Created $COMPOSE_OVERRIDE (port $Port, CORS origin http://${lanIP}:${Port})"

# Step 4: Firewall
Write-Step 4 "Configuring Windows Firewall..."
$fwOk = Add-FirewallRule -RulePort $Port

# Step 5: Build & Start
if ($SkipBuild) {
    Write-Step 5 "Starting containers (skip build)..."
    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE -p $PROJECT_NAME up -d
} else {
    Write-Step 5 "Building and starting containers (this may take a few minutes)..."
    docker compose --env-file $ENV_FILE -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE -p $PROJECT_NAME up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Err "Docker Compose failed. Check the output above."
    exit 1
}
Write-Ok "Containers started."

# Step 6: Health Check
Write-Step 6 "Running health check..."
$healthy = Wait-ForHealth -Url "http://localhost:${Port}" -Timeout $HEALTH_TIMEOUT -Interval $HEALTH_INTERVAL

# Step 7: Summary
Write-Host ""
Write-Host ""
$line = '═' * 60
Write-Host "  $line" -ForegroundColor Green
Write-Host ""
if ($healthy) {
    Write-Host "   🎉 CMS V2 is LIVE on your network!" -ForegroundColor Green
} else {
    Write-Host "   ⏳ CMS V2 is still starting up..." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "   ┌──────────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "   │                                                  │" -ForegroundColor Cyan
Write-Host "   │  YOUR access (this PC):                          │" -ForegroundColor Cyan
Write-Host "   │    → http://localhost:$Port                       │" -ForegroundColor White
Write-Host "   │                                                  │" -ForegroundColor Cyan
Write-Host "   │  CLASSMATES access (same Wi-Fi):                 │" -ForegroundColor Cyan
Write-Host "   │    → http://${lanIP}:${Port}                     │" -ForegroundColor White
Write-Host "   │                                                  │" -ForegroundColor Cyan
Write-Host "   └──────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""
if (-not $fwOk) {
    Write-Host "   ⚠  Firewall rule was NOT created (not Admin)." -ForegroundColor Yellow
    Write-Host "      Classmates may not be able to connect." -ForegroundColor Yellow
    Write-Host "      Re-run as Administrator: Right-click PowerShell → Run as Admin" -ForegroundColor Yellow
    Write-Host ""
}
Write-Host "   COMMANDS:" -ForegroundColor DarkGray
Write-Host "     Stop:       .\lan-deploy.ps1 -Stop" -ForegroundColor DarkGray
Write-Host "     Full clean: .\lan-deploy.ps1 -Clean" -ForegroundColor DarkGray
Write-Host "     Restart:    .\lan-deploy.ps1 -SkipBuild" -ForegroundColor DarkGray
Write-Host "     Logs:       docker compose --env-file $ENV_FILE -f $COMPOSE_FILE -p $PROJECT_NAME logs -f" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  $line" -ForegroundColor Green
Write-Host ""

