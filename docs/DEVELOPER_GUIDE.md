# HarmonizeIQ - Developer Guide

## 1. Getting Started

### 1.1 Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Docker Desktop | 20.x+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Node.js | 20.x+ | [nodejs.org](https://nodejs.org/) |
| Python | 3.11+ | [python.org](https://www.python.org/) |
| Git | 2.x+ | [git-scm.com](https://git-scm.com/) |

### 1.2 Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/harmonizeiq.git
cd harmonizeiq
```

---

## 2. Local Development Setup

### 2.1 Option A: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access Points:**
- Frontend: http://localhost:9000
- Backend API: http://localhost:9001
- NLP Service: http://localhost:9002
- PostgreSQL: localhost:9432

### 2.2 Option B: Manual Setup

#### Step 1: Database

```bash
# Start PostgreSQL with pgvector
docker run -d \
  --name harmonizeiq-db \
  -e POSTGRES_USER=harmonize_admin \
  -e POSTGRES_PASSWORD=harmonize_secret_2024 \
  -e POSTGRES_DB=harmonizeiq \
  -p 9432:5432 \
  pgvector/pgvector:pg16

# Apply schema
psql -h localhost -p 9432 -U harmonize_admin -d harmonizeiq -f database/schema.sql
psql -h localhost -p 9432 -U harmonize_admin -d harmonizeiq -f database/seed.sql
```

#### Step 2: NLP Service

```bash
cd nlp-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn main:app --reload --port 9002
```

#### Step 3: Backend API

```bash
cd backend

# Install dependencies
npm install

# Run in development mode
npm run dev
```

#### Step 4: Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run in development mode
npm run dev
```

---

## 3. Project Structure

```
harmonizeiq/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # Utilities & API client
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/                  # Node.js Backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── clients/         # External service clients
│   │   ├── database/        # DB connection & queries
│   │   ├── middleware/      # Express middleware
│   │   └── index.ts         # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── nlp-service/             # Python NLP Service
│   ├── main.py              # FastAPI app
│   └── requirements.txt
│
├── database/                # Database Scripts
│   ├── schema.sql           # Table definitions
│   └── seed.sql             # Sample data
│
├── mock-data/               # Data Generation
│   └── generate_mock_data.py
│
├── aws/                     # AWS Deployment
│   ├── cloudformation-template.yaml
│   └── deploy.sh
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── AWS_DEPLOYMENT.md
│   ├── DEVELOPER_GUIDE.md
│   └── PRD.md
│
└── docker-compose.yml       # Local orchestration
```

---

## 4. Tech Stack Deep Dive

### 4.1 Frontend (React + TypeScript)

**Key Libraries:**
| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| React Router | Navigation |
| TanStack Query | Data fetching & caching |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Recharts | Data visualization |
| Lucide React | Icons |

**Component Pattern:**
```tsx
// pages/Dashboard.tsx
export default function Dashboard() {
  // Hooks at top
  const { data, isLoading } = useQuery({...});
  
  // Early returns for loading/error
  if (isLoading) return <Skeleton />;
  
  // Main render
  return (
    <motion.div>
      {/* Component content */}
    </motion.div>
  );
}
```

### 4.2 Backend (Node.js + Express)

**Architecture Pattern:** Clean Architecture

```
Routes → Services → Database
           ↓
       NLP Client
```

**Adding a New Endpoint:**

```typescript
// 1. Create route file: src/routes/example.routes.ts
import { Router } from 'express';
import { ExampleService } from '../services/example.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const exampleRoutes = Router();
const service = new ExampleService();

exampleRoutes.get('/', asyncHandler(async (req, res) => {
  const result = await service.getAll();
  res.json(result);
}));

// 2. Register in src/routes/index.ts
import { exampleRoutes } from './example.routes.js';
router.use('/example', exampleRoutes);
```

### 4.3 NLP Service (Python + FastAPI)

**Adding a New Endpoint:**

```python
# main.py

class NewInput(BaseModel):
    text: str

@app.post("/new-endpoint")
async def new_endpoint(input: NewInput):
    # Process input
    result = process(input.text)
    return {"result": result}
```

---

## 5. Database Operations

### 5.1 Connection

```typescript
// backend/src/database/connection.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '9432'),
  database: process.env.DB_NAME || 'harmonizeiq',
  user: process.env.DB_USER || 'harmonize_admin',
  password: process.env.DB_PASSWORD || 'harmonize_secret_2024',
});
```

### 5.2 Common Queries

```sql
-- Find top matches for a raw product
SELECT * FROM find_top_matches('raw-id-here', 5);

-- Get mapping statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(final_confidence) as avg_confidence
FROM equivalence_map
GROUP BY status;

-- Search products by embedding similarity
SELECT 
  id, 
  canonical_name,
  1 - (description_embedding <=> $1) as similarity
FROM manufacturer_catalog
ORDER BY description_embedding <=> $1
LIMIT 10;
```

### 5.3 Migrations

Currently using raw SQL files. For production, consider:
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [node-pg-migrate](https://github.com/salsita/node-pg-migrate)

---

## 6. API Reference

### 📖 Interactive API Documentation

| Service | Swagger URL |
|---------|-------------|
| Backend API | http://localhost:9001/docs |
| NLP Service | http://localhost:9002/docs |

### 6.1 Catalog Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalog` | List products (paginated) |
| GET | `/api/catalog/:id` | Get single product |
| GET | `/api/catalog/meta/brands` | List all brands |
| GET | `/api/catalog/meta/categories` | List all categories |
| POST | `/api/catalog` | Create product |
| PUT | `/api/catalog/:id` | Update product |

### 6.2 Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/catalog` | Upload master catalog CSV |
| POST | `/api/upload/retailer` | Upload retailer data CSV |
| POST | `/api/upload/sales` | Upload sales data CSV |
| POST | `/api/upload/process` | Trigger AI processing |
| GET | `/api/upload/status` | Get processing status |
| GET | `/api/upload/templates` | Get CSV templates |

### 6.3 Mapping Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mapping` | List all mappings |
| GET | `/api/mapping/pending` | Get HITL queue |
| GET | `/api/mapping/stats` | Get statistics |
| POST | `/api/mapping/:id/approve` | Approve mapping |
| POST | `/api/mapping/:id/reject` | Reject mapping |
| POST | `/api/mapping/manual` | Create manual mapping |

### 6.4 Export Endpoints (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/mappings` | Export mappings (CSV/JSON) |
| GET | `/api/export/catalog` | Export catalog with counts |
| GET | `/api/export/retailer/:code` | Export by retailer |
| GET | `/api/export/analytics/summary` | Overall statistics |
| GET | `/api/export/analytics/cross-retailer` | Multi-retailer comparison |
| GET | `/api/export/analytics/price-comparison` | Price analysis |

### 6.5 Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard stats |
| GET | `/api/analytics/sales` | Sales data |
| GET | `/api/analytics/benchmark` | Competitor comparison |
| GET | `/api/analytics/market-share` | Market share |
| GET | `/api/analytics/trends` | Sales trends |

---

## 7. Testing

### 7.1 Backend Tests

```bash
cd backend
npm test
```

### 7.2 Frontend Tests

```bash
cd frontend
npm test
```

### 7.3 API Testing with cURL

```bash
# Health check
curl http://localhost:9001/health

# Get catalog
curl http://localhost:9001/api/catalog

# Test NLP similarity
curl -X POST http://localhost:9002/similarity \
  -H "Content-Type: application/json" \
  -d '{"text1": "Crest 3D White Toothpaste", "text2": "CR 3DW TP MNT"}'
```

---

## 8. Code Style & Conventions

### 8.1 TypeScript

- Use strict mode
- Prefer `interface` over `type` for objects
- Use `async/await` over `.then()`
- Export types from dedicated files

### 8.2 React

- Functional components only
- Custom hooks for reusable logic
- Co-locate components with their styles
- Use Tailwind CSS classes

### 8.3 Python

- Follow PEP 8
- Use type hints
- Async functions where possible
- Pydantic for data validation

---

## 9. Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 9001 | Server port |
| DB_HOST | localhost | Database host |
| DB_PORT | 9432 | Database port |
| DB_NAME | harmonizeiq | Database name |
| DB_USER | harmonize_admin | Database user |
| DB_PASSWORD | harmonize_secret_2024 | Database password |
| NLP_SERVICE_URL | http://localhost:9002 | NLP service URL |
| CORS_ORIGIN | http://localhost:9000 | Allowed CORS origin |

### NLP Service

| Variable | Default | Description |
|----------|---------|-------------|
| PYTHONUNBUFFERED | 1 | Unbuffered output |

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change ports in docker-compose.yml |
| NLP model download slow | First run downloads ~500MB model |
| Database connection refused | Ensure PostgreSQL container is running |
| CORS errors | Check CORS_ORIGIN environment variable |

### Useful Commands

```bash
# View container logs
docker-compose logs -f backend

# Restart a single service
docker-compose restart backend

# Rebuild images
docker-compose build --no-cache

# Access database shell
docker exec -it harmonizeiq-db psql -U harmonize_admin -d harmonizeiq

# Check container status
docker-compose ps
```

---

## 11. Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

### Commit Message Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
