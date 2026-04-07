param(
	[switch]$UseLocalStack
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$composeBaseArgs = if ($UseLocalStack) {
	@("compose", "-f", "docker-compose.yml")
}
else {
	@("compose", "--env-file", ".env.prod", "-f", "docker-compose.prod.yml")
}

$localstackHealthUri = "http://localhost:4566/_localstack/health"
$localstackBucketFallback = "cms-buksu-uploads"
$maxHealthAttempts = 30
$healthRetryDelaySeconds = 3

function Invoke-Compose {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Arguments
	)

	$allArgs = $composeBaseArgs + $Arguments
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
		[string]$Uri
	)

	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		try {
			$response = Invoke-WebRequest -Uri $Uri -Method Get -TimeoutSec 10
			if ($response.StatusCode -eq 200) {
				Write-Host "  [OK] $Name" -ForegroundColor Green
				return
			}
		}
		catch {
			# Keep retrying until timeout.
		}

		Write-Host "  [WAIT] $Name ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
		Start-Sleep -Seconds $healthRetryDelaySeconds
	}

	throw "Health check failed: $Name ($Uri)"
}

function Wait-PlagiarismHealth {
	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		try {
			Invoke-Compose -Arguments @(
				"exec", "-T", "plagiarism_api",
				"curl", "-fsS", "-o", "/dev/null", "http://localhost:8001/health"
			)
			Write-Host "  [OK] plagiarism_api /health" -ForegroundColor Green
			return
		}
		catch {
			Write-Host "  [WAIT] plagiarism_api /health ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
			Start-Sleep -Seconds $healthRetryDelaySeconds
		}
	}

	throw "Health check failed: plagiarism_api /health"
}

function Test-ComposeCommandSucceeds {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Arguments
	)

	$allArgs = $composeBaseArgs + $Arguments
	& docker @allArgs *> $null
	return $LASTEXITCODE -eq 0
}

function Resolve-ComposeProjectName {
	$envProjectName = "$($env:COMPOSE_PROJECT_NAME)".Trim()
	if (-not [string]::IsNullOrWhiteSpace($envProjectName)) {
		Write-Host "  [OK] using COMPOSE_PROJECT_NAME from environment: $envProjectName" -ForegroundColor Green
		return $envProjectName
	}

	$allArgs = $composeBaseArgs + @("config", "--format", "json")
	$configJson = (& docker @allArgs 2>$null | Out-String)
	if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($configJson)) {
		throw "Unable to resolve compose project name from docker compose config."
	}

	try {
		$config = $configJson | ConvertFrom-Json -ErrorAction Stop
	}
	catch {
		throw "Unable to parse docker compose config output while resolving project name."
	}

	$resolvedProjectName = ""
	if ($null -ne $config -and $config.PSObject.Properties.Name -contains "name") {
		$resolvedProjectName = "$($config.name)".Trim()
	}

	if ([string]::IsNullOrWhiteSpace($resolvedProjectName)) {
		throw "Unable to resolve compose project name from compose context."
	}

	Write-Host "  [OK] resolved compose project name from compose context: $resolvedProjectName" -ForegroundColor Green
	return $resolvedProjectName
}

function Wait-LocalStackHealthy {
	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		try {
			$response = Invoke-WebRequest -Uri $localstackHealthUri -Method Get -TimeoutSec 10
			if ($response.StatusCode -eq 200) {
				$payload = $null
				try {
					$payload = $response.Content | ConvertFrom-Json -ErrorAction Stop
				}
				catch {
					$payload = $null
				}

				$status = ''
				$s3Status = ''

				if ($null -ne $payload -and $payload.PSObject.Properties.Name -contains 'status') {
					$status = "$($payload.status)".ToLowerInvariant()
				}

				if ($null -ne $payload -and $payload.PSObject.Properties.Name -contains 'services') {
					$services = $payload.services
					if ($null -ne $services -and $services.PSObject.Properties.Name -contains 's3') {
						$s3Status = "$($services.s3)".ToLowerInvariant()
					}
				}

				$healthyTokens = @("running", "available", "up", "healthy")

				if ($healthyTokens -contains $status -or $healthyTokens -contains $s3Status) {
					Write-Host "  [OK] localstack health endpoint" -ForegroundColor Green
					return
				}
			}
		}
		catch {
			# Keep retrying until timeout.
		}

		Write-Host "  [WAIT] localstack health endpoint ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
		Start-Sleep -Seconds $healthRetryDelaySeconds
	}

	throw "Health check failed: localstack endpoint did not report healthy state ($localstackHealthUri)"
}

function Resolve-LocalStackBucketName {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FallbackBucketName
	)

	$bucketProbeScript = "process.stdout.write((process.env.S3_BUCKET || '').trim())"

	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		$allArgs = $composeBaseArgs + @(
			"exec", "-T", "server",
			"node", "-e", $bucketProbeScript
		)

		$resolvedBucket = (& docker @allArgs 2>$null | Out-String).Trim()

		if ($LASTEXITCODE -eq 0) {
			if (-not [string]::IsNullOrWhiteSpace($resolvedBucket)) {
				Write-Host "  [OK] resolved server S3_BUCKET: $resolvedBucket" -ForegroundColor Green
				return $resolvedBucket
			}

			Write-Host "  [WARN] server S3_BUCKET is blank; using fallback bucket $FallbackBucketName" -ForegroundColor DarkYellow
			return $FallbackBucketName
		}

		Write-Host "  [WAIT] resolving server S3_BUCKET ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
		Start-Sleep -Seconds $healthRetryDelaySeconds
	}

	Write-Host "  [WARN] unable to resolve server S3_BUCKET; using fallback bucket $FallbackBucketName" -ForegroundColor DarkYellow
	return $FallbackBucketName
}

function Wait-LocalStackBucket {
	param(
		[Parameter(Mandatory = $true)]
		[string]$BucketName
	)

	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		if (
			Test-ComposeCommandSucceeds -Arguments @(
				"exec", "-T", "localstack",
				"awslocal", "s3api", "head-bucket", "--bucket", $BucketName
			)
		) {
			Write-Host "  [OK] localstack bucket exists: $BucketName" -ForegroundColor Green
			return
		}

		Write-Host "  [WAIT] localstack bucket: $BucketName ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
		Start-Sleep -Seconds $healthRetryDelaySeconds
	}

	throw "Bucket verification failed: $BucketName was not found in LocalStack."
}

function Wait-ServerStorageHealth {
	$healthCheckScript = "import storageService from './services/storage.service.js'; const result = await storageService.healthCheck(); if (!result || result.healthy !== true) { console.error(result ? JSON.stringify(result) : '{}'); process.exit(1); }"

	for ($attempt = 1; $attempt -le $maxHealthAttempts; $attempt++) {
		if (
			Test-ComposeCommandSucceeds -Arguments @(
				"exec", "-T", "-w", "/app/server", "server",
				"node", "--input-type=module", "-e", $healthCheckScript
			)
		) {
			Write-Host "  [OK] server storageService.healthCheck() reports healthy=true" -ForegroundColor Green
			return
		}

		Write-Host "  [WAIT] server storageService.healthCheck() ($attempt/$maxHealthAttempts)" -ForegroundColor DarkYellow
		Start-Sleep -Seconds $healthRetryDelaySeconds
	}

	throw "Server-origin S3 connectivity check failed: storageService.healthCheck() did not report healthy=true."
}

function Assert-RequiredNgrokEnvVars {
	param(
		[Parameter(Mandatory = $true)]
		[string]$EnvFilePath
	)

	function Test-NgrokBasicAuthDefaultLike {
		param(
			[Parameter(Mandatory = $true)]
			[string]$Value
		)

		$normalized = $Value.Trim().ToLowerInvariant()

		if ($normalized -match '(?i)\b(changeme|default|placeholder|example)\b') {
			return $true
		}

		if ($normalized -match '^(admin|user|username|test)\s*[:/]\s*(admin|password|test)$') {
			return $true
		}

		if ($normalized -match '(^|[^a-z0-9])test\s*[:/]\s*test([^a-z0-9]|$)') {
			return $true
		}

		return $false
	}

	if (-not (Test-Path -Path $EnvFilePath -PathType Leaf)) {
		throw "Required env file not found: $EnvFilePath"
	}

	$requiredVariables = @("NGROK_AUTHTOKEN", "NGROK_DOMAIN")
	$envMap = @{}

	foreach ($line in Get-Content -Path $EnvFilePath -ErrorAction Stop) {
		$trimmedLine = $line.Trim()
		if ([string]::IsNullOrWhiteSpace($trimmedLine) -or $trimmedLine.StartsWith("#")) {
			continue
		}

		$separatorIndex = $trimmedLine.IndexOf("=")
		if ($separatorIndex -lt 1) {
			continue
		}

		$key = $trimmedLine.Substring(0, $separatorIndex).Trim()
		if ($key.StartsWith("export ")) {
			$key = $key.Substring(7).Trim()
		}

		$value = $trimmedLine.Substring($separatorIndex + 1).Trim()
		$wasQuoted = $false
		if (
			$value.Length -ge 2 -and (
				($value.StartsWith('"') -and $value.EndsWith('"')) -or
				($value.StartsWith("'") -and $value.EndsWith("'"))
			)
		) {
			$wasQuoted = $true
			$value = $value.Substring(1, $value.Length - 2)
		}

		if (-not $wasQuoted) {
			$value = ($value -replace '\s+#.*$', '').Trim()
		}

		$envMap[$key] = $value
	}

	$missingOrBlank = @()
	foreach ($requiredVariable in $requiredVariables) {
		$value = ""
		if ($envMap.ContainsKey($requiredVariable)) {
			$value = "$($envMap[$requiredVariable])".Trim()
		}

		if ([string]::IsNullOrWhiteSpace($value)) {
			$missingOrBlank += $requiredVariable
			Write-Host "  [FAIL] missing required ngrok variable: $requiredVariable" -ForegroundColor Red
		}
		else {
			Write-Host "  [OK] required ngrok variable set: $requiredVariable" -ForegroundColor Green
		}
	}

	if ($missingOrBlank.Count -gt 0) {
		throw "Fail-closed: .env.prod is missing required ngrok variables or values: $($missingOrBlank -join ', ')"
	}

	$ngrokOAuthProvider = ""
	if ($envMap.ContainsKey("NGROK_OAUTH_PROVIDER")) {
		$ngrokOAuthProvider = "$($envMap["NGROK_OAUTH_PROVIDER"])".Trim()
	}

	$ngrokBasicAuth = ""
	if ($envMap.ContainsKey("NGROK_BASIC_AUTH")) {
		$ngrokBasicAuth = "$($envMap["NGROK_BASIC_AUTH"])".Trim()
	}

	if ([string]::IsNullOrWhiteSpace($ngrokOAuthProvider) -and [string]::IsNullOrWhiteSpace($ngrokBasicAuth)) {
		Write-Host "  [FAIL] NGROK_OAUTH_PROVIDER not set" -ForegroundColor Red
		Write-Host "  [FAIL] NGROK_BASIC_AUTH not set" -ForegroundColor Red
		throw "Fail-closed: set either NGROK_OAUTH_PROVIDER (preferred) or NGROK_BASIC_AUTH (fallback)."
	}

	if (-not [string]::IsNullOrWhiteSpace($ngrokOAuthProvider)) {
		Write-Host "  [OK] OAuth mode selected via NGROK_OAUTH_PROVIDER" -ForegroundColor Green

		$oauthAllowEmails = ""
		if ($envMap.ContainsKey("NGROK_OAUTH_ALLOW_EMAILS")) {
			$oauthAllowEmails = "$($envMap["NGROK_OAUTH_ALLOW_EMAILS"])".Trim()
		}

		$oauthAllowDomains = ""
		if ($envMap.ContainsKey("NGROK_OAUTH_ALLOW_DOMAINS")) {
			$oauthAllowDomains = "$($envMap["NGROK_OAUTH_ALLOW_DOMAINS"])".Trim()
		}

		if ([string]::IsNullOrWhiteSpace($oauthAllowEmails) -and [string]::IsNullOrWhiteSpace($oauthAllowDomains)) {
			Write-Host "  [FAIL] NGROK_OAUTH_ALLOW_EMAILS not set" -ForegroundColor Red
			Write-Host "  [FAIL] NGROK_OAUTH_ALLOW_DOMAINS not set" -ForegroundColor Red
			throw "Fail-closed: OAuth mode requires NGROK_OAUTH_ALLOW_EMAILS or NGROK_OAUTH_ALLOW_DOMAINS."
		}

		if (-not [string]::IsNullOrWhiteSpace($oauthAllowEmails)) {
			Write-Host "  [OK] NGROK_OAUTH_ALLOW_EMAILS configured" -ForegroundColor Green
		}
		else {
			Write-Host "  [INFO] NGROK_OAUTH_ALLOW_EMAILS not provided" -ForegroundColor DarkYellow
		}

		if (-not [string]::IsNullOrWhiteSpace($oauthAllowDomains)) {
			Write-Host "  [OK] NGROK_OAUTH_ALLOW_DOMAINS configured" -ForegroundColor Green
		}
		else {
			Write-Host "  [INFO] NGROK_OAUTH_ALLOW_DOMAINS not provided" -ForegroundColor DarkYellow
		}

		Write-Host "  [OK] ngrok OAuth policy validation passed" -ForegroundColor Green
		return
	}

	Write-Host "  [OK] basic auth fallback mode selected via NGROK_BASIC_AUTH" -ForegroundColor Green
	if (Test-NgrokBasicAuthDefaultLike -Value $ngrokBasicAuth) {
		Write-Host "  [FAIL] NGROK_BASIC_AUTH appears default-like/placeholder" -ForegroundColor Red
		throw "Fail-closed: NGROK_BASIC_AUTH appears default-like or placeholder. Provide non-default credentials."
	}

	Write-Host "  [OK] ngrok basic auth fallback validation passed" -ForegroundColor Green
}

function Assert-NgrokContainerRunning {
	$runningNgrok = & docker ps --filter "name=cms-ngrok-prod" --format "{{.Names}}"
	if ($LASTEXITCODE -ne 0) {
		throw "docker ps failed while checking ngrok container."
	}

	if ([string]::IsNullOrWhiteSpace(($runningNgrok | Out-String))) {
		throw "Expected ngrok container is not running in production rebuild."
	}

	Write-Host "  [OK] ngrok container is running for public-exposure profile" -ForegroundColor Green
}

function Get-RunningComposeContainersForProject {
	param(
		[Parameter(Mandatory = $true)]
		[string]$ProjectName
	)

	$rows = & docker ps --filter "label=com.docker.compose.project=$ProjectName" --format '{{.Names}}|{{.Label "com.docker.compose.project.config_files"}}'
	if ($LASTEXITCODE -ne 0) {
		throw "docker ps failed while checking compose project '$ProjectName'."
	}

	$containers = @()
	foreach ($row in $rows) {
		if ([string]::IsNullOrWhiteSpace($row)) {
			continue
		}

		$parts = $row.Split("|", 2)
		$containers += [PSCustomObject]@{
			Name = $parts[0].Trim()
			ConfigFiles = if ($parts.Count -gt 1) { $parts[1].Trim() } else { "" }
		}
	}

	return $containers
}

function Assert-NoRunningDevComposeContainers {
	param(
		[Parameter(Mandatory = $true)]
		[string]$ProjectName
	)

	$runningContainers = Get-RunningComposeContainersForProject -ProjectName $ProjectName
	$runningDevContainers = @(
		$runningContainers | Where-Object {
			$_.ConfigFiles -match 'docker-compose\.yml' -and $_.ConfigFiles -notmatch 'docker-compose\.prod\.yml'
		}
	)

	if ($runningDevContainers.Count -gt 0) {
		$details = ($runningDevContainers | ForEach-Object { "$($_.Name) [$($_.ConfigFiles)]" }) -join "; "
		throw "Fail-closed: detected running containers from docker-compose.yml in project '$ProjectName': $details. Remediation: run 'docker compose -f docker-compose.yml down --remove-orphans' (or remove the listed containers), then rerun rebuild-prod.ps1."
	}

	Write-Host "  [OK] no running docker-compose.yml containers detected in project '$ProjectName'" -ForegroundColor Green
}

function Assert-ContainerRunning {
	param(
		[Parameter(Mandatory = $true)]
		[string]$ContainerName
	)

	$runningState = (& docker inspect --format "{{.State.Running}}" $ContainerName 2>$null | Out-String).Trim().ToLowerInvariant()
	if ($LASTEXITCODE -ne 0 -or $runningState -ne "true") {
		throw "Expected container '$ContainerName' to be running."
	}

	Write-Host "  [OK] container running: $ContainerName" -ForegroundColor Green
}

function Remove-ContainerIfExists {
	param(
		[Parameter(Mandatory = $true)]
		[string]$ContainerName
	)

	$containerId = (& docker inspect --format "{{.Id}}" $ContainerName 2>$null | Out-String).Trim()
	if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
		return
	}

	& docker rm -f $ContainerName *> $null
	if ($LASTEXITCODE -ne 0) {
		throw "Failed to remove existing container '$ContainerName'."
	}

	Write-Host "  [OK] removed existing container: $ContainerName" -ForegroundColor Green
}

function Assert-ContainerNotRunning {
	param(
		[Parameter(Mandatory = $true)]
		[string]$ContainerName
	)

	$runningState = (& docker inspect --format "{{.State.Running}}" $ContainerName 2>$null | Out-String).Trim().ToLowerInvariant()
	if ($LASTEXITCODE -eq 0) {
		if ($runningState -eq "true") {
			throw "Unexpected running container detected: '$ContainerName'."
		}

		throw "Unexpected container detected: '$ContainerName' exists but should be absent."
	}

	Write-Host "  [OK] container absent: $ContainerName" -ForegroundColor Green
}

function Assert-ClientCanResolveServerHealth {
	$probeResponse = (& docker exec cms-client-prod wget -qO- "http://server:5000/api/health" 2>$null | Out-String).Trim()
	if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($probeResponse)) {
		throw "Fail-closed: cms-client-prod could not reach http://server:5000/api/health. Check shared network and service DNS before exposing production ingress."
	}

	Write-Host "  [OK] cms-client-prod resolved server:5000 and fetched /api/health" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
if ($UseLocalStack) {
	Write-Host " CMS LocalStack Stack Clean Rebuild" -ForegroundColor Cyan
}
else {
	Write-Host " CMS Production Stack Clean Rebuild" -ForegroundColor Cyan
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
	if ($UseLocalStack) {
		Write-Host "[1/6] Bringing local development stack down with orphan cleanup..." -ForegroundColor Yellow
		Invoke-Compose -Arguments @("down", "--remove-orphans")

		Write-Host "[2/6] Rebuilding and starting local development stack..." -ForegroundColor Yellow
		Invoke-Compose -Arguments @("up", "-d", "--build")

		Write-Host "[3/6] Current container state:" -ForegroundColor Yellow
		Invoke-Compose -Arguments @("ps")

		Write-Host "[4/6] Verifying LocalStack health and bucket provisioning..." -ForegroundColor Yellow
		Wait-LocalStackHealthy
		$resolvedLocalStackBucket = Resolve-LocalStackBucketName -FallbackBucketName $localstackBucketFallback
		Wait-LocalStackBucket -BucketName $resolvedLocalStackBucket

		Write-Host "[5/6] Verifying server-origin S3 connectivity..." -ForegroundColor Yellow
		Wait-ServerStorageHealth

		Write-Host "[6/6] Verifying API health endpoint..." -ForegroundColor Yellow
		Wait-Http200 -Name "server /api/health" -Uri "http://localhost:5000/api/health"

		Write-Host ""
		Write-Host "========================================" -ForegroundColor Green
		Write-Host " LocalStack rebuild and verification passed" -ForegroundColor Green
		Write-Host "========================================" -ForegroundColor Green
	}
	else {
		Write-Host "[1/8] Validating required ngrok configuration in .env.prod..." -ForegroundColor Yellow
		Assert-RequiredNgrokEnvVars -EnvFilePath ".env.prod"

		Write-Host "[2/8] Fail-closed preflight: checking for mixed docker-compose.yml containers..." -ForegroundColor Yellow
		$composeProjectName = Resolve-ComposeProjectName
		Assert-NoRunningDevComposeContainers -ProjectName $composeProjectName

		Write-Host "[3/8] Bringing stack down with orphan cleanup and removing legacy containers..." -ForegroundColor Yellow
		Invoke-Compose -Arguments @("down", "--remove-orphans")
		Invoke-Compose -Arguments @("--profile", "public-exposure", "down", "--remove-orphans")
		Remove-ContainerIfExists -ContainerName "cms-server"

		Write-Host "[4/8] Rebuilding and starting production stack with public exposure..." -ForegroundColor Yellow
		Invoke-Compose -Arguments @("--profile", "public-exposure", "up", "-d", "--build")

		Write-Host "[5/8] Current container state:" -ForegroundColor Yellow
		Invoke-Compose -Arguments @("ps")

		Write-Host "[6/8] Verifying critical health endpoints..." -ForegroundColor Yellow
		Wait-Http200 -Name "server /api/health" -Uri "http://localhost:8080/api/health"
		Wait-PlagiarismHealth

		Write-Host "[7/8] Confirming ngrok container is running..." -ForegroundColor Yellow
		Assert-NgrokContainerRunning

		Write-Host "[8/8] Verifying production container topology and proxy DNS..." -ForegroundColor Yellow
		Assert-ContainerRunning -ContainerName "cms-server-prod"
		Assert-ContainerRunning -ContainerName "cms-client-prod"
		Assert-ContainerRunning -ContainerName "cms-ngrok-prod"
		Assert-ContainerNotRunning -ContainerName "cms-server"
		Assert-ClientCanResolveServerHealth

		Write-Host ""
		Write-Host "========================================" -ForegroundColor Green
		Write-Host " Production rebuild and verification passed" -ForegroundColor Green
		Write-Host "========================================" -ForegroundColor Green
	}
	exit 0
}
catch {
	Write-Host "" 
	if ($UseLocalStack) {
		Write-Host "[FAIL] LocalStack rebuild verification failed." -ForegroundColor Red
	}
	else {
		Write-Host "[FAIL] Production rebuild verification failed." -ForegroundColor Red
	}
	Write-Host "Reason: $($_.Exception.Message)" -ForegroundColor Red

	try {
		Write-Host "\nContainer snapshot:" -ForegroundColor Yellow
		Invoke-Compose -Arguments @("ps")
	}
	catch {
		Write-Host "Unable to capture docker compose ps output." -ForegroundColor Red
	}

	exit 1
}
