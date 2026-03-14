param (
    [switch]$Build,
    [switch]$Reset,
    [switch]$Logs
)

$ErrorActionPreference = 'Continue'
$ROOT = $PSScriptRoot

function Msg($text, $color = 'White') { Write-Host $text -ForegroundColor $color }
function Step($text) { Msg "[STEP] $text" 'Yellow' }
function Ok($text) { Msg "[OK]   $text" 'Green' }
function Warn($text) { Msg "[WARN] $text" 'DarkYellow' }
function Err($text) { Msg "[ERR]  $text" 'Red' }

function Assert-Docker {
    Step 'Checking Docker...'
    docker version *> $null
    if ($LASTEXITCODE -ne 0) {
        Err 'Docker is not available. Start Docker Desktop first.'
        exit 1
    }
    Ok 'Docker is running.'
}

function Normalize-InitScript {
    $path = Join-Path $ROOT 'infra\init-aws.sh'
    if (-not (Test-Path $path)) {
        Err 'Missing infra/init-aws.sh'
        exit 1
    }
    $raw = [System.IO.File]::ReadAllText($path)
    $lf = $raw -replace "`r`n", "`n" -replace "`r", "`n"
    [System.IO.File]::WriteAllText($path, $lf, [System.Text.UTF8Encoding]::new($false))
    Ok 'infra/init-aws.sh normalized to LF.'
}

function Wait-Health($container, $timeoutSec = 120) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        $health = docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $container 2>$null

        if ($status -eq 'running' -and ($health -eq 'healthy' -or $health -eq 'none')) {
            Ok "$container running (health=$health)"
            return $true
        }

        if ($status -eq 'exited' -or $status -eq 'dead') {
            Err "$container stopped (status=$status)"
            docker logs --tail 80 $container
            return $false
        }

        Start-Sleep -Seconds 3
        $elapsed += 3
    }

    Err "$container not healthy after ${timeoutSec}s"
    docker logs --tail 80 $container
    return $false
}

function Ensure-S3Bucket {
    Step 'Ensuring LocalStack bucket cms-buksu-uploads exists...'
    docker exec cms-localstack bash /etc/localstack/init/ready.d/init-aws.sh *> $null
    $list = docker exec cms-localstack awslocal s3 ls 2>&1 | Out-String
    if ($list -match 'cms-buksu-uploads') {
        Ok 'S3 bucket cms-buksu-uploads is ready.'
        return $true
    }
    Err 'S3 bucket not found after init script.'
    return $false
}

function Verify-Redis {
    Step 'Checking Redis PING...'
    $pong = docker exec cms-redis redis-cli ping 2>&1
    if (("$pong".Trim()) -eq 'PONG') {
        Ok 'Redis responds with PONG.'
        return $true
    }
    Err "Redis ping failed: $pong"
    docker logs --tail 80 cms-redis
    return $false
}

Set-Location $ROOT
Msg '=== CMS V2 Docker Startup ===' 'Cyan'

Assert-Docker
Normalize-InitScript

if ($Reset) {
    Step 'Reset requested: docker-compose down -v --remove-orphans'
    docker-compose down -v --remove-orphans
}

if ($Build) {
    Step 'Starting services with build...'
    docker-compose up -d --build
} else {
    Step 'Starting services...'
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Err 'docker-compose up failed. Attempting one automatic retry after down...'
    docker-compose down --remove-orphans
    Start-Sleep -Seconds 2
    if ($Build) { docker-compose up -d --build } else { docker-compose up -d }
    if ($LASTEXITCODE -ne 0) {
        Err 'Second startup attempt failed.'
        exit 1
    }
}

$ok = $true
$ok = (Wait-Health 'cms-mongodb' 90) -and $ok
$ok = (Wait-Health 'cms-redis' 45) -and $ok
$ok = (Wait-Health 'cms-localstack' 90) -and $ok
$ok = (Wait-Health 'cms-plagiarism-redis' 45) -and $ok
$ok = (Wait-Health 'cms-plagiarism-api' 180) -and $ok
$ok = (Wait-Health 'cms-server' 180) -and $ok
$ok = (Wait-Health 'cms-client' 120) -and $ok

$ok = (Ensure-S3Bucket) -and $ok
$ok = (Verify-Redis) -and $ok

Step 'Checking API health endpoint...'
try {
    $resp = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -TimeoutSec 10 -ErrorAction Stop
    Ok "API health returned HTTP $($resp.StatusCode)"
} catch {
    Warn "API health not ready yet: $($_.Exception.Message)"
    $ok = $false
}

Msg ''
Msg 'Container status:' 'Cyan'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | findstr /R /C:"cms-"

if ($ok) {
    Msg ''
    Ok 'Environment is up and validated.'
    Msg 'Web:        http://localhost:5173' 'Cyan'
    Msg 'API:        http://localhost:5000/api/health' 'Cyan'
    Msg 'LocalStack: http://localhost:4566/_localstack/health' 'Cyan'
    Msg 'Plagiarism: http://localhost:8001/health' 'Cyan'
} else {
    Err 'One or more checks failed. See logs above.'
    Msg 'Run: docker-compose logs -f [service]' 'DarkYellow'
    exit 1
}

if ($Logs) {
    Step 'Streaming logs (Ctrl+C to stop)...'
    docker-compose logs -f
}
