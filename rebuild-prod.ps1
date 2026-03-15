# rebuild-prod.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CMS Production Stack Clean & Rebuild" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Update NPM packages everywhere to avoid deprecation warnings
Write-Host "[0/6] Updating all NPM packages to avoid deprecations & logging output..." -ForegroundColor Yellow
Write-Host " -> Log output saved to update_logs.txt for future review."
"=== NPM Update Logs ===" | Out-File -FilePath update_logs.txt

Write-Host "  -> Updating Root packages..." -ForegroundColor Gray
npm update >> update_logs.txt 2>&1
npm audit fix >> update_logs.txt 2>&1

Write-Host "  -> Updating Server packages..." -ForegroundColor Gray
cd server
npm update >> ..\update_logs.txt 2>&1
npm audit fix >> ..\update_logs.txt 2>&1
cd ..

Write-Host "  -> Updating Client packages..." -ForegroundColor Gray
cd client
npm update >> ..\update_logs.txt 2>&1
npm audit fix >> ..\update_logs.txt 2>&1
cd ..

# 1. Stop all running containers
Write-Host "[1/6] Stopping and removing existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# 2. Wipe the specific corrupted ChromaDB volume (leaves MongoDB safe)
Write-Host "[2/6] Cleaning up corrupted ChromaDB volumes..." -ForegroundColor Yellow
docker volume rm cmsv2_chromadb_prod_data 2>$null

# 3. Wipe the old images so Docker is forced to rebuild from our new code
Write-Host "[3/6] Removing old CMS images..." -ForegroundColor Yellow
docker rmi cmsv2-plagiarism_api 2>$null
docker rmi cmsv2-plagiarism_worker 2>$null
docker rmi cmsv2-server 2>$null
docker rmi cmsv2-client 2>$null
docker-compose -f docker-compose.prod.yml rm -f

# 4. Perform a completely clean build 
Write-Host "[4/6] Rebuilding all images from scratch (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Start the stack back up
Write-Host "[5/6] Starting the fresh production stack..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Rebuild Complete! Containers are starting." -ForegroundColor Green
Write-Host " Package update logs saved to update_logs.txt to help future decisions." -ForegroundColor Green
Write-Host " You can check the docker logs with: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
