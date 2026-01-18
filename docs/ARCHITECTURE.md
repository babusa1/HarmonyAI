# HarmonizeIQ - Architecture Document

## 1. Executive Summary

HarmonizeIQ is an AI-powered platform for product data harmonization in the FMCG/CPG industry. The system maps disparate product descriptions from multiple retailers to a unified "Golden Record" using semantic similarity and attribute matching.

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     React 18 + TypeScript + Tailwind                   │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │Dashboard│ │  HITL   │ │Analytics│ │ Upload  │ │ Catalog │        │ │
│  │  │  Page   │ │ Review  │ │  Page   │ │  Page   │ │  Page   │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               API LAYER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Node.js + Express + TypeScript                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │ Catalog  │ │ Retailer │ │ Mapping  │ │Analytics │ │  Upload  │   │ │
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────────────┐
│        NLP/AI LAYER             │ │              DATA LAYER                  │
│  ┌───────────────────────────┐ │ │  ┌─────────────────────────────────────┐│
│  │  Python + FastAPI         │ │ │  │     PostgreSQL 16 + pgvector        ││
│  │  ┌─────────────────────┐  │ │ │  │  ┌─────────┐ ┌─────────────────┐   ││
│  │  │ Sentence Transformers│  │ │ │  │  │ Tables  │ │ Vector Indexes  │   ││
│  │  │ (all-MiniLM-L6-v2)  │  │ │ │  │  └─────────┘ └─────────────────┘   ││
│  │  └─────────────────────┘  │ │ │  └─────────────────────────────────────┘│
│  │  ┌─────────────────────┐  │ │ └─────────────────────────────────────────┘
│  │  │ Similarity Engine   │  │ │
│  │  └─────────────────────┘  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### 2.2 Component Summary

| Component | Technology | Purpose | Port |
|-----------|------------|---------|------|
| Frontend | React 18, TypeScript, Tailwind | User interface | 9000 |
| Backend API | Node.js, Express, TypeScript | Business logic, REST API | 9001 |
| NLP Service | Python, FastAPI, Transformers | AI/ML processing | 9002 |
| Database | PostgreSQL 16, pgvector | Data persistence, vector search | 9432 |

---

## 3. Data Architecture

### 3.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│   source_systems    │       │     categories      │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ code                │       │ name                │
│ name                │       │ parent_id (FK)      │
│ type                │       │ level               │
└─────────────────────┘       └─────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌─────────────────────┐       ┌─────────────────────┐
│  retailer_data_raw  │       │ manufacturer_catalog│
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ source_system_id(FK)│       │ gtin                │
│ external_sku        │       │ canonical_name      │
│ raw_description     │       │ brand_id (FK)       │
│ description_embedding│      │ category_id (FK)    │
│ processing_status   │       │ size_value          │
└─────────────────────┘       │ description_embedding│
         │                    └─────────────────────┘
         │                              │
         │      ┌───────────────────────┘
         │      │
         ▼      ▼
┌─────────────────────┐       ┌─────────────────────┐
│   equivalence_map   │       │ sales_transactions  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ master_id (FK)      │       │ raw_id (FK)         │
│ raw_id (FK)         │       │ transaction_date    │
│ semantic_score      │       │ units_sold          │
│ attribute_score     │       │ revenue             │
│ final_confidence    │       └─────────────────────┘
│ status              │
│ is_competitor       │
└─────────────────────┘
```

### 3.2 Vector Storage (pgvector)

Embeddings are stored as `vector(384)` columns:
- `manufacturer_catalog.description_embedding`
- `retailer_data_raw.description_embedding`

**Index Type:** IVFFlat with cosine distance
```sql
CREATE INDEX idx_catalog_embedding ON manufacturer_catalog 
  USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 4. AI/ML Architecture

### 4.1 Embedding Model

| Property | Value |
|----------|-------|
| Model | all-MiniLM-L6-v2 |
| Provider | Sentence Transformers (HuggingFace) |
| Dimensions | 384 |
| Size | ~80MB |
| Speed | ~1000 embeddings/second (CPU) |

### 4.2 Matching Algorithm

```python
def calculate_match_score(master, raw):
    # Step 1: Semantic Similarity (70% weight)
    # Cosine similarity: cos(θ) = (A · B) / (||A|| × ||B||)
    semantic_score = cosine_similarity(
        master.embedding, 
        raw.embedding
    )
    
    # Step 2: Attribute Matching (30% weight)
    # Brand match: 60% of attribute score
    # Size match: 40% of attribute score
    brand_score = fuzzy_match(master.brand, raw.brand) / 100
    size_score = 1 - abs(master.size_ml - raw.size_ml) / max(...)
    attribute_score = (0.6 * brand_score) + (0.4 * size_score)
    
    # Step 3: Weighted Combination
    final_confidence = (0.70 * semantic_score) + (0.30 * attribute_score)
    
    return final_confidence
```

### 4.3 Confidence Thresholds

| Range | Action | Rationale |
|-------|--------|-----------|
| ≥ 0.95 | Auto-confirm | Very high confidence, minimal risk |
| 0.70 - 0.95 | Human review | Needs verification |
| < 0.70 | Flag | Likely new product or mismatch |

---

## 5. API Architecture

### 5.1 API Documentation

Interactive Swagger documentation available at:
- **Backend API**: http://localhost:9001/docs
- **NLP Service**: http://localhost:9002/docs

### 5.2 RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalog` | List manufacturer products |
| GET | `/api/retailer` | List retailer raw data |
| GET | `/api/mapping/pending` | Get HITL review queue |
| POST | `/api/mapping/{id}/approve` | Approve a mapping |
| POST | `/api/mapping/{id}/reject` | Reject a mapping |
| GET | `/api/analytics/dashboard` | Dashboard statistics |
| GET | `/api/analytics/benchmark` | Competitor comparison |
| POST | `/api/upload/catalog` | Upload product catalog |
| POST | `/api/upload/retailer` | Upload retailer data |
| POST | `/api/upload/process` | Trigger AI processing |
| GET | `/api/export/mappings` | Export mappings (CSV/JSON) |
| GET | `/api/export/catalog` | Export catalog |
| GET | `/api/export/analytics/summary` | Summary statistics |
| GET | `/api/export/analytics/cross-retailer` | Cross-retailer comparison |
| GET | `/api/export/analytics/price-comparison` | Price analysis |

### 5.2 Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│   Nginx/ALB     │ (Routing, SSL termination)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Express Middleware│ (CORS, Auth, Logging)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Route Handler │ (Validation, Request parsing)
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Service      │────▶│   NLP Client    │ (If AI needed)
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
```

---

## 6. Security Architecture

### 6.1 Authentication (Future)

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Roles: Admin, Reviewer, Analyst, Viewer

### 6.2 Data Security

| Layer | Measure |
|-------|---------|
| Transport | HTTPS/TLS 1.3 |
| Database | Encryption at rest (RDS) |
| Secrets | Environment variables / AWS Secrets Manager |
| API | Rate limiting, input validation |

---

## 7. Scalability Considerations

### 7.1 Current Capacity (MVP)

| Metric | Capacity |
|--------|----------|
| Products in catalog | ~10,000 |
| Retailer SKUs | ~50,000 |
| Concurrent users | ~10 |
| Embeddings/second | ~100 |

### 7.2 Scale-Up Path

| Scale | Changes Needed |
|-------|----------------|
| 100K SKUs | Add read replicas |
| 1M SKUs | Move to dedicated vector DB (Pinecone) |
| 10M SKUs | Horizontal scaling, sharding |
| Real-time | Add Redis caching, message queues |

---

## 8. Deployment Architecture

### 8.1 Local (Docker Compose)

```
┌─────────────────────────────────────────────┐
│               Docker Host                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Frontend │ │ Backend │ │   NLP   │       │
│  │  :9000  │ │  :9001  │ │  :9002  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│        │           │           │            │
│        └───────────┴───────────┘            │
│                    │                        │
│             ┌──────▼──────┐                 │
│             │  PostgreSQL │                 │
│             │    :9432    │                 │
│             └─────────────┘                 │
└─────────────────────────────────────────────┘
```

### 8.2 AWS Production

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS VPC                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                Public Subnets                          ││
│  │  ┌─────────────┐                                       ││
│  │  │     ALB     │ ◄─── Internet Gateway                ││
│  │  └──────┬──────┘                                       ││
│  └─────────┼──────────────────────────────────────────────┘│
│            │                                                │
│  ┌─────────▼──────────────────────────────────────────────┐│
│  │                Private Subnets                         ││
│  │  ┌───────────────────────────────────────────────────┐ ││
│  │  │              ECS Fargate Cluster                  │ ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐             │ ││
│  │  │  │Frontend │ │ Backend │ │   NLP   │             │ ││
│  │  │  │ Task    │ │  Task   │ │  Task   │             │ ││
│  │  │  └─────────┘ └─────────┘ └─────────┘             │ ││
│  │  └───────────────────────────────────────────────────┘ ││
│  │                         │                              ││
│  │                  ┌──────▼──────┐                       ││
│  │                  │ RDS Postgres │                      ││
│  │                  │  (pgvector)  │                      ││
│  │                  └──────────────┘                      ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | React 18 | Industry standard, rich ecosystem |
| Backend Runtime | Node.js | Non-blocking I/O, TypeScript support |
| AI Framework | FastAPI + Transformers | Python ML ecosystem, async support |
| Database | PostgreSQL + pgvector | Single DB for relational + vector |
| Embedding Model | all-MiniLM-L6-v2 | Balance of speed and accuracy |
| Containerization | Docker | Consistent environments |
| CSS Framework | Tailwind CSS | Rapid UI development |

---

## 10. Future Architecture Considerations

1. **Message Queue** (RabbitMQ/SQS) for async processing
2. **Redis Cache** for frequently accessed data
3. **Elasticsearch** for full-text search
4. **Dedicated Vector DB** (Pinecone/Weaviate) at scale
5. **ML Pipeline** (MLflow) for model versioning
6. **Event Sourcing** for audit trail

---

*Document Version: 1.0*  
*Last Updated: January 2026*
