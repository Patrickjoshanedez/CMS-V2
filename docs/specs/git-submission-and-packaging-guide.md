# 📦 Git Submission & Monorepo Packaging Guide for Panel Evaluation

This instruction sheet provides a clean, standardized protocol for verifying, packaging, and exporting the **BukSU Capstone Management System V2 (CMS-V2)** monorepo for the Capstone Evaluation Panel members.

---

## 1. Pre-Submission Quality & Cleanliness Checklist

Before creating the final export archive, execute the full verification battery to guarantee zero loose caches or regression failures:

```bash
# 1. Verify workspace cleanliness and lack of clutter
python scripts/workspace_guardrail.py
# (Expected output: "✅ Workspace is pristine! Cognitive-load parameters are within bounds.")

# 2. Verify ASDLC Agentic Governance & Security gates
npm run validate:agentic
# (Expected output: 60/60 checks passing, 0 failed)

# 3. Verify Server Unit & Service Suites
npx vitest run tests/unit
# (Expected output: 22/22 test files passed, 108/108 tests)

# 4. Verify React Frontend Unit & Store Suites
npm test --workspace=client
# (Expected output: 28/28 test files passed, 76/76 tests)
```

---

## 2. Standardized Packaging Instructions

To ensure panel members receive an untainted, lightweight package that builds cleanly without bloated node dependencies or environment secrets, follow the packaging commands below.

### What Must Be Excluded from the Archive:
* ❌ `node_modules/` (Root, server, and client dependency trees)
* ❌ `.venv/` (Python virtual environments)
* ❌ `.git/` (Local git objects and hooks—optional, or keep if Git history is required)
* ❌ `.env`, `.env.local`, `.env.prod` (Environment secret overrides; `.env.example` is included)
* ❌ Build artifacts (`dist/`, `build/`, `out/`)

---

### Method A: Native PowerShell Archive (Windows)

Run the following command from the repository root to create a clean, reproducible `.zip` package:

```powershell
# Define excluded patterns
$exclude = @(
    '*\node_modules\*',
    '*\.venv\*',
    '*\dist\*',
    '*\build\*',
    '*\.env',
    '*\.env.prod',
    '*\.env.deploy',
    '*\tmp\*',
    '*\test-results\*'
)

# Collect clean project files and compress
$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $path = $_.FullName
    $match = $false
    foreach ($pattern in $exclude) {
        if ($path -like $pattern) { $match = $true; break }
    }
    -not $match
}

# Create target release zip
$files | Compress-Archive -DestinationPath "..\CMS-V2-Panel-Submission.zip" -Force
Write-Host "✅ Created clean package: CMS-V2-Panel-Submission.zip" -ForegroundColor Green
```

---

### Method B: Native TAR / GZIP (Cross-Platform / Linux / macOS)

```bash
tar --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.env' \
    --exclude='.env.prod' \
    --exclude='.env.deploy' \
    --exclude='tmp' \
    --exclude='test-results' \
    -czvf CMS-V2-Panel-Submission.tar.gz .
```

---

## 3. Panel Member Quick-Start Evaluation Guide

Include the following setup notes with the submission package for the evaluation committee:

### Prerequisites:
1. **Node.js**: v18.18+ or v20+
2. **Docker & Docker Compose**: v24+
3. **Python**: v3.10+ (for plagiarism detection engine)

---

### One-Command Setup & Launch:

#### 1. Quick Development Launch (Recommended for Local Demo):
```bash
# 1. Install Node.js dependencies
npm install

# 2. Copy environment templates
cp .env.example .env

# 3. Start full system with hot-reloading
powershell -ExecutionPolicy Bypass -File scripts/start-local-dev.ps1
```

#### 2. Full Dockerized Production Stack Launch:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 4. Key Subsystems & URLs for Panel Testing

| Subsystem | Port / URL | Key Capabilities to Inspect |
| :--- | :--- | :--- |
| **Frontend Web Client** | `http://localhost:5173` | Project discovery, role-based dashboards, proposal review workflows, calendar scheduling. |
| **REST API Server** | `http://localhost:5000` | Express 5 endpoints, JWT / Bearer auth, project state machine, audit logging. |
| **Plagiarism Checker Engine** | `http://localhost:8000` | FastAPI service, PyTorch + Winnowing hybrid document similarity analysis. |
| **Redis / BullMQ Queue** | `localhost:6379` | Asynchronous metadata extraction jobs, plagiarism scan worker pipelines. |
| **MongoDB Database** | `mongodb://localhost:27017` | Document storage, proposal schema, user roles, audit trails. |
