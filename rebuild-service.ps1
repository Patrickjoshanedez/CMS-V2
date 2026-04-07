param(
    [string[]]$Services = @("server", "client"),
    [switch]$IncludeDependencies,
    [switch]$NoCache,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$composeFile = "docker-compose.prod.yml"
$envFile = ".env.prod"

function Fail {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [int]$ExitCode = 1
    )

    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit $ExitCode
}

function Invoke-DockerCompose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [switch]$CaptureOutput
    )

    $baseArgs = @("compose", "--env-file", $envFile, "-f", $composeFile)
    $allArgs = $baseArgs + $Arguments

    if ($CaptureOutput) {
        $output = & docker @allArgs 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            $commandText = "docker " + ($allArgs -join " ")
            $details = ($output | Out-String).Trim()
            if ([string]::IsNullOrWhiteSpace($details)) {
                $details = "no output"
            }
            Fail -Message "Command failed ($exitCode): $commandText`n$details" -ExitCode $exitCode
        }
        return @($output)
    }

    & docker @allArgs
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $commandText = "docker " + ($allArgs -join " ")
        Fail -Message "Command failed ($exitCode): $commandText" -ExitCode $exitCode
    }
}

Write-Host "[INFO] Using compose file: $composeFile"
Write-Host "[INFO] Using env file: $envFile"

if (-not (Test-Path -Path $composeFile -PathType Leaf)) {
    Fail -Message "Compose file not found: $composeFile"
}

if (-not (Test-Path -Path $envFile -PathType Leaf)) {
    Fail -Message "Env file not found: $envFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail -Message "docker command not found in PATH"
}

if ($null -eq $Services -or $Services.Count -eq 0) {
    Fail -Message "No services requested. Use -Services server,client"
}

$requestedServices = @()
foreach ($service in $Services) {
    if ([string]::IsNullOrWhiteSpace($service)) {
        continue
    }
    $parts = $service.Split(',', [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($part in $parts) {
        $trimmed = $part.Trim()
        if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
            $requestedServices += $trimmed
        }
    }
}

if ($requestedServices.Count -eq 0) {
    Fail -Message "No valid services requested after trimming input"
}

Write-Host "[INFO] Resolving services from compose config..."
$availableServicesRaw = Invoke-DockerCompose -Arguments @("config", "--services") -CaptureOutput
$availableServices = @()
foreach ($line in $availableServicesRaw) {
    $name = "$line".Trim()
    if (-not [string]::IsNullOrWhiteSpace($name)) {
        $availableServices += $name
    }
}

if ($availableServices.Count -eq 0) {
    Fail -Message "No services discovered from compose config"
}

$missingServices = @()
foreach ($service in $requestedServices) {
    if ($availableServices -notcontains $service) {
        $missingServices += $service
    }
}

if ($missingServices.Count -gt 0) {
    $known = $availableServices -join ", "
    $missing = $missingServices -join ", "
    Fail -Message "Unknown service(s): $missing. Available: $known"
}

$serviceList = $requestedServices -join ", "
Write-Host "[INFO] Target services: $serviceList"

if (-not $SkipBuild) {
    $buildArgs = @("build")
    if ($NoCache) {
        $buildArgs += "--no-cache"
    }
    $buildArgs += $requestedServices

    Write-Host "[STEP] Building services..."
    Invoke-DockerCompose -Arguments $buildArgs
}
else {
    Write-Host "[STEP] Skipping build (-SkipBuild)"
}

$upArgs = @("up", "-d", "--force-recreate")
if (-not $IncludeDependencies) {
    $upArgs += "--no-deps"
}
$upArgs += $requestedServices

Write-Host "[STEP] Recreating services..."
Invoke-DockerCompose -Arguments $upArgs

Write-Host "[DONE] Rebuild/recreate completed successfully."