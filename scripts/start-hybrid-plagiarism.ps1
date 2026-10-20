[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status')]
    [string]$Action = 'Start'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeArgs = @('-f', 'docker-compose.yml', '--profile', 'plagiarism-tunnel')
$previousNgrokToken = $env:NGROK_AUTHTOKEN
$previousEngineToken = $env:PLAGIARISM_ENGINE_API_TOKEN
$previousTunnelDomain = $env:PLAGIARISM_TUNNEL_DOMAIN

function ConvertFrom-SecurePrompt {
    param([Parameter(Mandatory)][string]$Prompt)

    $secureValue = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Invoke-Docker {
    param([Parameter(Mandatory)][string[]]$Arguments)

    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed with exit code $LASTEXITCODE."
    }
}

try {
    Set-Location $repoRoot

    if ($Action -eq 'Status') {
        Invoke-Docker -Arguments (@('compose') + $composeArgs + @('ps', 'plagiarism_api', 'plagiarism_worker', 'plagiarism_ngrok'))
        exit 0
    }

    Invoke-Docker -Arguments @('info')

    if ($Action -eq 'Stop') {
        Invoke-Docker -Arguments (@('compose') + $composeArgs + @('stop', 'plagiarism_ngrok', 'plagiarism_api', 'plagiarism_worker'))
        exit 0
    }

    $ngrokToken = if ($env:NGROK_AUTHTOKEN) { $env:NGROK_AUTHTOKEN } else { ConvertFrom-SecurePrompt -Prompt 'ngrok authtoken' }
    $engineToken = if ($env:PLAGIARISM_ENGINE_API_TOKEN) { $env:PLAGIARISM_ENGINE_API_TOKEN } else { ConvertFrom-SecurePrompt -Prompt 'Shared plagiarism API token (use the same value in cloud secrets)' }
    if ($engineToken.Length -lt 32) {
        throw 'The shared plagiarism API token must contain at least 32 characters.'
    }

    $tunnelDomain = Read-Host -Prompt 'Reserved ngrok domain (leave blank for an assigned URL)'
    $env:NGROK_AUTHTOKEN = $ngrokToken
    $env:PLAGIARISM_ENGINE_API_TOKEN = $engineToken
    $env:PLAGIARISM_TUNNEL_DOMAIN = $tunnelDomain.Trim()

    Invoke-Docker -Arguments (@('compose') + $composeArgs + @('up', '-d', '--build', 'plagiarism_api', 'plagiarism_worker', 'plagiarism_ngrok'))

    $deadline = (Get-Date).AddSeconds(100)
    $engineHealthy = $false
    $tunnelUrl = $null
    while ((Get-Date) -lt $deadline -and (-not $engineHealthy -or -not $tunnelUrl)) {
        if (-not $engineHealthy) {
            try {
                $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/health' -TimeoutSec 2
                $engineHealthy = $null -ne $health
            }
            catch { }
        }

        if (-not $tunnelUrl) {
            $logs = (& docker logs --tail 100 cms-plagiarism-ngrok 2>&1 | Out-String)
            $urlMatches = [regex]::Matches($logs, 'https://[A-Za-z0-9.-]+(?::\d+)?')
            if ($urlMatches.Count -gt 0) {
                $tunnelUrl = $urlMatches[$urlMatches.Count - 1].Value
            }
        }

        if (-not $engineHealthy -or -not $tunnelUrl) {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $engineHealthy) {
        throw 'The plagiarism API did not become healthy within 100 seconds. Check its container logs.'
    }
    if (-not $tunnelUrl) {
        throw 'The ngrok tunnel did not become ready within 100 seconds. Check its container logs and account limits.'
    }

    Write-Host "Plagiarism API is protected and reachable at: $tunnelUrl"
    Write-Host 'Set PLAGIARISM_ENGINE_URL to this URL in the cloud deployment secrets.'
    Write-Host 'Set PLAGIARISM_ENGINE_API_TOKEN to the same secret entered above in the cloud deployment secrets.'
    Write-Host 'Deploy the cloud stack with docker-compose.prod.yml plus docker-compose.hybrid.yml.'
}
finally {
    $env:NGROK_AUTHTOKEN = $previousNgrokToken
    $env:PLAGIARISM_ENGINE_API_TOKEN = $previousEngineToken
    $env:PLAGIARISM_TUNNEL_DOMAIN = $previousTunnelDomain
}
