# HarmonizeIQ - Development Setup

## 🚀 Quick Start (Production Mode)
```powershell
docker-compose up -d
# Open: http://localhost:9000
```

## 💻 Development Mode (NO Docker Rebuild Needed!)

### Option 1: Full Docker Dev Mode
```powershell
# Uses volume mounts - backend code changes reflect immediately
docker-compose -f docker-compose.dev.yml up -d
```

### Option 2: Hybrid (Best for Frontend Development)
```powershell
# Start only backend services in Docker
docker-compose up -d postgres nlp-service backend

# Run frontend locally with hot reload
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173 with hot reload!
```

### Option 3: Local Development (No Docker for Backend)
```powershell
# Start only database and NLP service
docker-compose up -d postgres nlp-service

# Run backend locally
cd backend
npm install
npm run dev  # Runs on port 9001

# Run frontend locally
cd frontend
npm install
npm run dev  # Runs on port 5173
```

---

## 📁 Project Structure

```
RETAIL_DATA HARMONIZATION/
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   └── clients/   # External service clients
│   └── Dockerfile
│
├── frontend/          # React/Vite frontend
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Shared components
│   │   └── lib/       # API client, utils
│   └── Dockerfile
│
├── nlp-service/       # Python FastAPI NLP service
│   ├── main.py        # NLP endpoints
│   └── Dockerfile.pytorch-base
│
├── database/          # PostgreSQL schema
│   └── schema.sql
│
├── demo-data/         # Sample data for demos
│   ├── master_catalog.csv
│   ├── walmart_retailer_data.csv
│   ├── target_retailer_data.csv
│   ├── kroger_retailer_data.csv
│   └── walmart_sales.csv
│
├── docker-compose.yml      # Production
└── docker-compose.dev.yml  # Development
```

---

## 🔧 Making Code Changes

### Frontend Changes
```powershell
# Best approach - run locally with hot reload
cd frontend
npm run dev

# Or rebuild Docker if you must
docker-compose build frontend
docker-compose up -d frontend
```

### Backend Changes
```powershell
# With docker-compose.dev.yml, changes auto-reflect (volume mounted)
# Just save the file!

# Or restart if needed
docker-compose restart backend
```

### NLP Service Changes
```powershell
# NLP service rarely needs changes, but if needed:
docker-compose build nlp-service
docker-compose up -d nlp-service
```

---

## 🧪 Testing the API

### Health Checks
```powershell
# Backend
curl http://localhost:9001/health

# NLP Service  
curl http://localhost:9002/health

# Database
docker exec harmonizeiq-db pg_isready -U harmonize_admin -d harmonizeiq
```

### Upload Test
```powershell
# Upload master catalog
curl -X POST http://localhost:9001/api/upload/catalog `
  -F "file=@demo-data/master_catalog.csv"

# Upload retailer data
curl -X POST http://localhost:9001/api/upload/retailer `
  -F "file=@demo-data/walmart_retailer_data.csv" `
  -F "sourceSystem=WALMART"
```

---

## 📊 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 9000 | http://localhost:9000 |
| Backend API | 9001 | http://localhost:9001 |
| NLP Service | 9002 | http://localhost:9002 |
| PostgreSQL | 9432 | localhost:9432 |

---

## 🐛 Troubleshooting

### View Logs
```powershell
docker logs harmonizeiq-backend
docker logs harmonizeiq-nlp
docker logs harmonizeiq-frontend
```

### Restart Services
```powershell
docker-compose restart
```

### Reset Database
```powershell
docker-compose down -v  # Removes volumes!
docker-compose up -d
```

### Clean Docker Cache
```powershell
docker builder prune -f
docker system prune -f
```
