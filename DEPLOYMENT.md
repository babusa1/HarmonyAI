# HarmonizeIQ Deployment Guide 🚀

## Quick Start - Local Development

### Prerequisites
- Docker Desktop installed
- Node.js 20+ (for local development without Docker)
- Python 3.11+ (for NLP service without Docker)
- PostgreSQL 16+ with pgvector extension

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
cd harmonizeiq

# Start all services
docker-compose up -d

# Wait for services to be healthy (~2-3 minutes on first run)
docker-compose ps

# Access the application
# Frontend:    http://localhost:9000
# Backend API: http://localhost:9001
# NLP Service: http://localhost:9002
# PostgreSQL:  localhost:9432
```

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL with pgvector
docker run -d \
  --name harmonizeiq-db \
  -e POSTGRES_USER=harmonize_admin \
  -e POSTGRES_PASSWORD=harmonize_secret_2024 \
  -e POSTGRES_DB=harmonizeiq \
  -p 9432:5432 \
  pgvector/pgvector:pg16

# Apply schema
psql -h localhost -p 9432 -U harmonize_admin -d harmonizeiq -f database/schema.sql

# 2. Start NLP Service
cd nlp-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 9002

# 3. Start Backend (new terminal)
cd backend
npm install
npm run dev

# 4. Start Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Generate Mock Data

```bash
cd mock-data
python generate_mock_data.py

# This creates:
# - output/manufacturer_catalog.csv (500 products)
# - output/retailer_raw_data.csv (2500 SKUs)
# - output/sales_transactions.csv (50,000 transactions)
```

---

## AWS Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐                                            │
│  │   Route 53     │ (Custom Domain)                            │
│  └───────┬────────┘                                            │
│          │                                                      │
│  ┌───────▼────────┐                                            │
│  │ CloudFront CDN │ (Optional)                                 │
│  └───────┬────────┘                                            │
│          │                                                      │
│  ┌───────▼────────┐                                            │
│  │      ALB       │ (Application Load Balancer)                │
│  └───────┬────────┘                                            │
│          │                                                      │
│  ┌───────┴───────────────────────────┐                         │
│  │         ECS Fargate Cluster        │                        │
│  │  ┌─────────┐ ┌─────────┐ ┌──────┐ │                        │
│  │  │Frontend │ │ Backend │ │ NLP  │ │                        │
│  │  │ React   │ │ Node.js │ │FastAPI│                        │
│  │  └─────────┘ └─────────┘ └──────┘ │                        │
│  └───────────────────┬───────────────┘                         │
│                      │                                          │
│  ┌───────────────────▼───────────────┐                         │
│  │        RDS PostgreSQL              │                        │
│  │        (with pgvector)             │                        │
│  └────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Deploy Infrastructure

```bash
cd aws

# Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export DB_PASSWORD="YourSecurePassword123!"

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name harmonizeiq-production \
  --parameter-overrides \
    Environment=production \
    DBPassword=$DB_PASSWORD \
  --capabilities CAPABILITY_NAMED_IAM
```

### Step 2: Build and Push Docker Images

```bash
# Get ECR repository URIs
FRONTEND_REPO=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" \
  --output text)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${FRONTEND_REPO%%/*}

# Build and push each service
cd ../frontend
docker build -t $FRONTEND_REPO:latest .
docker push $FRONTEND_REPO:latest

cd ../backend
docker build -t $BACKEND_REPO:latest .
docker push $BACKEND_REPO:latest

cd ../nlp-service
docker build -t $NLP_REPO:latest .
docker push $NLP_REPO:latest
```

### Step 3: Create ECS Services

After pushing images, create ECS Task Definitions and Services via AWS Console or CLI.

### Estimated AWS Costs (Monthly)

| Service | Spec | Est. Cost |
|---------|------|-----------|
| ECS Fargate | 3 tasks (0.5 vCPU, 1GB each) | ~$50 |
| RDS PostgreSQL | db.t3.medium | ~$30 |
| ALB | Standard | ~$20 |
| ECR | Image storage | ~$5 |
| CloudWatch | Logs & metrics | ~$10 |
| **Total** | | **~$115/month** |

---

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=4000
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=harmonizeiq
DB_USER=harmonize_admin
DB_PASSWORD=your-secure-password
NLP_SERVICE_URL=http://nlp-service:8000
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=your-jwt-secret
```

### NLP Service
```env
PYTHONUNBUFFERED=1
# Model is loaded from HuggingFace cache
```

### Frontend
- API calls proxy through the same domain via nginx/ALB

---

## Monitoring & Observability

### CloudWatch Dashboards
- ECS CPU/Memory utilization
- ALB request counts and latency
- RDS connections and performance

### Alerts to Configure
1. ECS task failures
2. High CPU/Memory usage (>80%)
3. ALB 5xx error rate
4. RDS storage threshold

---

## Scaling Considerations

### For 2M+ SKUs:
1. **Database**: Upgrade RDS to db.r5.large or larger
2. **Vector Search**: Consider Pinecone or Weaviate for dedicated vector DB
3. **Caching**: Add ElastiCache (Redis) for frequently accessed data
4. **NLP Service**: Scale horizontally with more Fargate tasks
5. **Batch Processing**: Add SQS queues for async embedding generation

---

## Security Checklist

- [ ] Enable HTTPS with ACM certificate
- [ ] Configure WAF rules on ALB
- [ ] Enable RDS encryption at rest
- [ ] Rotate database credentials via Secrets Manager
- [ ] Configure VPC Flow Logs
- [ ] Enable CloudTrail for audit logging
- [ ] Set up IAM roles with least privilege

---

## Troubleshooting

### Common Issues

**NLP Service slow to start**
- The model download takes time on first start
- Consider pre-baking the model into the Docker image

**Database connection errors**
- Check security group rules
- Verify RDS endpoint and credentials

**High memory usage in NLP service**
- Increase Fargate task memory
- Consider using a smaller model (all-MiniLM-L6-v2 is already optimized)

---

## Support

For issues and questions:
- Check CloudWatch logs first
- Review ECS task events
- Verify security group configurations

**Built with ❤️ for FMCG/CPG Industry**
