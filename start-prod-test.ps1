param(
    [switch]$NoBrowser,
    [switch]$DryRun
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

        # Remove inline comments from unquoted values.
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

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CMS Production Test Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptRoot = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

$originalLocation = Get-Location
Push-Location -Path $scriptRoot

try {

$rebuildScriptPath = Join-Path -Path $scriptRoot -ChildPath "rebuild-prod.ps1"
if (-not (Test-Path $rebuildScriptPath)) {
    throw "Required script not found: $rebuildScriptPath"
}

$dockerIsAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
if (-not $dockerIsAvailable) {
    $dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
    if (Test-Path (Join-Path -Path $dockerBin -ChildPath "docker.exe")) {
        $env:PATH = "$dockerBin;$env:PATH"
    }
}

if ($DryRun) {
    Write-Host "[DRY-RUN] Would execute: .\\rebuild-prod.ps1" -ForegroundColor Yellow
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

$ngrokUrl = "https://$ngrokDomain"

Write-Host "" 
Write-Host "Production stack is ready." -ForegroundColor Green
Write-Host "Public test URL (auth still enforced): $ngrokUrl" -ForegroundColor Green

if (-not $NoBrowser) {
    if ($DryRun) {
        Write-Host "[DRY-RUN] Would open browser: $ngrokUrl" -ForegroundColor Yellow
    }
    else {
        Start-Process $ngrokUrl | Out-Null
        Write-Host "Opened default browser." -ForegroundColor Green
    }
}
}
finally {
    Pop-Location
    Set-Location -Path $originalLocation
}