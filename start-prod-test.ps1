param(
    [switch]$NoBrowser,
    [switch]$DryRun,
    [switch]$Public
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EnvFilePath,

        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if (-not (Test-Path $EnvFilePath)) {
        throw "Missing env file: $EnvFilePath"
    }

    $content = Get-Content -Path $EnvFilePath -ErrorAction Stop
    foreach ($rawLine in $content) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            continue
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $name = $line.Substring(0, $separatorIndex).Trim()
        if ($name -ne $Key) {
            continue
        }

        $value = $line.Substring($separatorIndex + 1).Trim()
        $isQuoted = ($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))
        if (-not $isQuoted) {
            $hashIndex = $value.IndexOf("#")
            if ($hashIndex -ge 0) {
                $value = $value.Substring(0, $hashIndex).Trim()
            }
        }

        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        return $value
    }

    return ""
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$CaptureOutput
    )

    $baseArgs = @("compose", "--env-file", ".env.prod", "-f", "docker-compose.prod.yml")
    $allArgs = $baseArgs + $Arguments

    if ($CaptureOutput) {
        $output = & docker @allArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose failed: $($Arguments -join ' ')"
        }

        return @($output)
    }

    & docker @allArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($Arguments -join ' ')"
    }
}

function Wait-Http200 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [int]$Attempts = 30,

        [int]$DelaySeconds = 3
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -Method Get -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] $Name" -ForegroundColor Green
                return
            }
        }
        catch {
            # Retry until timeout.
        }

        Write-Host "  [WAIT] $Name ($attempt/$Attempts)" -ForegroundColor DarkYellow
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Health check failed: $Name ($Uri)"
}

function Wait-PlagiarismHealth {
    param(
        [int]$Attempts = 30,

        [int]$DelaySeconds = 3
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        $output = & docker exec cms-plagiarism-api-prod curl -fsS http://localhost:8001/health 2>$null
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($output | Out-String))) {
            Write-Host "  [OK] plagiarism_api /health" -ForegroundColor Green
            return
        }

        Write-Host "  [WAIT] plagiarism_api /health ($attempt/$Attempts)" -ForegroundColor DarkYellow
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "Health check failed: plagiarism_api /health"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CMS Production Test Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptRoot = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

$originalLocation = Get-Location
Push-Location -Path $scriptRoot

try {
    $dockerIsAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
    if (-not $dockerIsAvailable) {
        $dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
        if (Test-Path (Join-Path -Path $dockerBin -ChildPath "docker.exe")) {
            $env:PATH = "$dockerBin;$env:PATH"
        }
    }

    if ($null -eq (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker CLI is not available in PATH. Start Docker Desktop first."
    }

    if ($Public) {
        $rebuildScriptPath = Join-Path -Path $scriptRoot -ChildPath "rebuild-prod.ps1"
        if (-not (Test-Path $rebuildScriptPath)) {
            throw "Required script not found: $rebuildScriptPath"
        }

        if ($DryRun) {
            Write-Host "[DRY-RUN] Would execute public profile: .\\rebuild-prod.ps1" -ForegroundColor Yellow
        }
        else {
            & pwsh -NoProfile -ExecutionPolicy Bypass -File $rebuildScriptPath
            if ($LASTEXITCODE -ne 0) {
                throw "Production rebuild failed with exit code $LASTEXITCODE"
            }
        }

        $ngrokDomain = Get-EnvValue -EnvFilePath ".env.prod" -Key "NGROK_DOMAIN"
        if ([string]::IsNullOrWhiteSpace($ngrokDomain)) {
            throw "NGROK_DOMAIN is missing or blank in .env.prod"
        }

        $launchUrl = "https://$ngrokDomain"
        Write-Host ""
        Write-Host "Production stack is ready (public exposure profile)." -ForegroundColor Green
        Write-Host "Public test URL (auth still enforced): $launchUrl" -ForegroundColor Green
    }
    else {
        if (-not (Test-Path ".env.prod")) {
            throw "Missing .env.prod. Copy .env.prod.example to .env.prod and fill required values."
        }

        $localServices = @(
            "mongodb",
            "redis",
            "chromadb",
            "plagiarism_api",
            "plagiarism_worker",
            "server",
            "client"
        )

        if ($DryRun) {
            Write-Host "[DRY-RUN] Would execute local prod rebuild for services:" -ForegroundColor Yellow
            Write-Host "          $($localServices -join ', ')" -ForegroundColor Yellow
        }
        else {
            Write-Host "[1/3] Rebuilding local production services..." -ForegroundColor Yellow
            Invoke-Compose -Arguments (@("up", "-d", "--build", "--remove-orphans") + $localServices)

            Write-Host "[2/3] Running health checks..." -ForegroundColor Yellow
            Wait-Http200 -Name "client /" -Uri "http://localhost:8080/"
            Wait-Http200 -Name "api /api/health" -Uri "http://localhost:8080/api/health"
            Wait-PlagiarismHealth

            Write-Host "[3/3] Current container state:" -ForegroundColor Yellow
            Invoke-Compose -Arguments @("ps")
        }

        $launchUrl = "http://localhost:8080"
        Write-Host ""
        Write-Host "Production stack is ready (local-only profile)." -ForegroundColor Green
        Write-Host "Local app URL: $launchUrl" -ForegroundColor Green
        Write-Host "API health URL: http://localhost:8080/api/health" -ForegroundColor Green
    }

    if (-not $NoBrowser) {
        if ($DryRun) {
            Write-Host "[DRY-RUN] Would open browser: $launchUrl" -ForegroundColor Yellow
        }
        else {
            Start-Process $launchUrl | Out-Null
            Write-Host "Opened default browser." -ForegroundColor Green
        }
    }
}
finally {
    Pop-Location
    Set-Location -Path $originalLocation
}