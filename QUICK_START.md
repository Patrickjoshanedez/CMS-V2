# 🚀 CMS V2 — Quick Start with Plagiarism Engine

## All-in-One Docker Setup ✨

Your CMS now includes an **integrated plagiarism detection system** that runs alongside all other services in a unified Docker stack.

---

## Prerequisites

- **Docker Desktop** installed and running
- **8GB RAM minimum** (plagiarism engine downloads ML models on first run)
- **10GB disk space** (for Docker images and ML models)

---

## ⚡ Start Everything in One Command

### Windows PowerShell:
```powershell
.\start-all-services.ps1
```

### Linux/Mac:
```bash
docker-compose up --build -d
```

**That's it!** All services will start automatically:
- ✅ MongoDB
- ✅ Redis (for CMS jobs)
- ✅ Plagiarism Redis (dedicated for plagiarism engine)
- ✅ Plagiarism Worker (Celery background processor)
- ✅ Plagiarism API (FastAPI service)
- ✅ CMS Backend (Express.js)
- ✅ CMS Frontend (Vite/React)

---

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Main React UI |
| **Backend API** | http://localhost:5000/api | REST API |
| **API Health** | http://localhost:5000/api/health | Backend status |
| **Plagiarism API** | http://localhost:8001 | Plagiarism engine |
| **Plagiarism Health** | http://localhost:8001/health | Engine status |

---

## 🧪 Verify Setup

### 1. Check all containers are running:
```powershell
docker-compose ps
```

**Expected output:**
```
NAME                    STATUS
cms-mongodb             Up
cms-redis               Up
cms-plagiarism-redis    Up
cms-plagiarism-worker   Up (healthy)
cms-plagiarism-api      Up (healthy)
cms-server              Up
cms-client              Up
```

### 2. Test CMS API:
```powershell
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "CMS API is running.",
  "environment": "development"
}
```

### 3. Test Plagiarism Engine:
```powershell
curl http://localhost:8001/health
```

**Expected response:**
```json
{
  "status": "healthy"
}
```

---

## 📋 First-Time Setup Notes

### On First Run:
1. **ML Model Download** — The plagiarism engine will download the `all-MiniLM-L6-v2` model (~90MB) on first startup. This may take 2-5 minutes depending on your internet speed.

2. **Container Build** — Docker will build all images. First build takes 5-10 minutes.

3. **Services Startup** — After build, services take 30-60 seconds to fully initialize.

**Be patient!** Check logs if needed:
```powershell
docker-compose logs -f plagiarism_api
```

---

## 🔧 Useful Commands

### View Logs:
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f plagiarism_api
docker-compose logs -f plagiarism_worker
```

### Stop All Services:
```powershell
docker-compose down
```

### Stop and Remove Volumes (fresh start):
```powershell
docker-compose down -v
```

### Restart a Specific Service:
```powershell
docker-compose restart server
docker-compose restart plagiarism_api
```

### Rebuild After Code Changes:
```powershell
docker-compose up --build -d
```

---

## 🧩 Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network                            │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐  │
│  │            │  │            │  │  Plagiarism Services     │  │
│  │  MongoDB   │  │   Redis    │  │  ┌──────────────────┐   │  │
│  │  (CMS DB)  │  │ (CMS Jobs) │  │  │ Plagiarism Redis │   │  │
│  │            │  │            │  │  └──────────────────┘   │  │
│  └────────────┘  └────────────┘  │  ┌──────────────────┐   │  │
│         ▲               ▲         │  │ Plagiarism Worker│◄──┤  │
│         │               │         │  │    (Celery)      │   │  │
│         │               │         │  └──────────────────┘   │  │
│  ┌──────┴───────────────┴──────┐ │  ┌──────────────────┐   │  │
│  │      CMS Server              │ │  │ Plagiarism API   │◄──┤  │
│  │      (Express.js)            │◄┼──│   (FastAPI)      │   │  │
│  │      Port: 5000              │ │  │   Port: 8001     │   │  │
│  └──────▲───────────────────────┘ │  └──────────────────┘   │  │
│         │                         └──────────────────────────┘  │
│  ┌──────┴───────────────────────┐                              │
│  │      CMS Client               │                              │
│  │      (Vite/React)             │                              │
│  │      Port: 5173               │                              │
│  └───────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 What's Already Configured

✅ **Backend API** — Plagiarism routes mounted at `/api/submissions/:id/plagiarism/*`

✅ **Environment Variables** — All plagiarism settings configured in docker-compose

✅ **Docker Networking** — All containers on the same network (`cms_network`)

✅ **Health Checks** — Automatic health monitoring for plagiarism services

✅ **Persistent Data** — ChromaDB and ML models stored in Docker volumes

---

## 🔍 Testing Plagiarism Detection

Once all services are running, you can test the plagiarism API:

### 1. Check plagiarism for a document:
```powershell
curl -X POST http://localhost:8001/check `
  -H "Content-Type: application/json" `
  -d '{
    "text": "This is a test document to check for similarity.",
    "title": "Test Document",
    "document_id": "test-123"
  }'
```

**Response:**
```json
{
  "task_id": "abc-123-def",
  "status": "pending"
}
```

### 2. Get check result:
```powershell
curl http://localhost:8001/result/abc-123-def
```

**Response:**
```json
{
  "task_id": "abc-123-def",
  "status": "completed",
  "similarity_percentage": 15.3,
  "text_matches": [...]
}
```

---

## 🚀 Next Steps

1. ✅ **Services Running** — All Docker containers are up
2. ⏳ **Frontend Integration** — Add `PlagiarismChecker` component to submission review page
3. ⏳ **Backend Integration** — Integrate with approval workflow
4. ⏳ **Testing** — Run browser tests and verify end-to-end flow

**See:** `NEXT_STEPS.md` for complete Phase 2-5 integration steps.

---

## ❓ Troubleshooting

### Issue: Plagiarism API returns 503
**Solution:**
- Check if worker is running: `docker-compose logs plagiarism_worker`
- Check if Redis is accessible: `docker-compose logs plagiarism_redis`
- Restart service: `docker-compose restart plagiarism_api`

### Issue: ML model download fails
**Solution:**
- Check internet connection
- Restart worker: `docker-compose restart plagiarism_worker`
- Check logs: `docker-compose logs -f plagiarism_worker`

### Issue: Container fails to start
**Solution:**
- Check logs: `docker-compose logs <service_name>`
- Rebuild: `docker-compose up --build -d`
- Fresh start: `docker-compose down -v && docker-compose up --build -d`

### Issue: Port already in use
**Solution:**
- Check what's using the port: `netstat -ano | findstr :5000`
- Stop the process or change the port in docker-compose.yml

---

## 📊 Performance Notes

**First Run:**
- Build time: 5-10 minutes
- ML model download: 2-5 minutes
- Total: ~15 minutes

**Subsequent Runs:**
- Startup time: 30-60 seconds
- ML models cached ✓
- Images cached ✓

**Memory Usage:**
- MongoDB: ~200MB
- Redis (both): ~50MB
- Plagiarism Worker: ~1.5GB (ML models in RAM)
- Plagiarism API: ~500MB
- CMS Server: ~300MB
- CMS Client: ~200MB
- **Total:** ~2.8GB RAM

---

## 🎉 You're All Set!

Your CMS V2 with integrated plagiarism detection is now running!

**Access the frontend:** http://localhost:5173

**Next:** Follow `NEXT_STEPS.md` Phase 2 to add the UI component.
