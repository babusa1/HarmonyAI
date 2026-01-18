# HarmonizeIQ - Complete Deployment Guide

## Overview

This guide provides step-by-step deployment instructions for:
- **Local Development** (Docker Compose)
- **AWS Production** (ECS Fargate + RDS)
- **Vercel** (Frontend) + **Railway/Render** (Backend)

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Docker Deployment](#2-local-docker-deployment)
3. [AWS Deployment](#3-aws-deployment)
4. [Vercel + Railway Deployment](#4-vercel--railway-deployment)
5. [Environment Variables](#5-environment-variables)
6. [Post-Deployment Checklist](#6-post-deployment-checklist)

---

## 1. Prerequisites

### Required Tools

| Tool | Version | Installation |
|------|---------|--------------|
| Git | 2.x+ | [git-scm.com](https://git-scm.com/) |
| Docker Desktop | 20.x+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Node.js | 20.x+ | [nodejs.org](https://nodejs.org/) |
| Python | 3.11+ | [python.org](https://www.python.org/) |
| AWS CLI | 2.x | [aws.amazon.com/cli](https://aws.amazon.com/cli/) |
| Vercel CLI | Latest | `npm install -g vercel` |

### Clone Repository

```bash
git clone https://github.com/babusa1/HarmonyAI.git
cd HarmonyAI
```

---

## 2. Local Docker Deployment

### Step 1: Start All Services

```bash
# Start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 2: Verify Services

| Service | URL | Health Check |
|---------|-----|--------------|
| Frontend | http://localhost:9000 | Open in browser |
| Backend API | http://localhost:9001/health | Should return `{"status":"healthy"}` |
| Backend Docs | http://localhost:9001/docs | Swagger UI |
| NLP Service | http://localhost:9002/health | Should return `{"status":"healthy"}` |
| NLP Docs | http://localhost:9002/docs | FastAPI docs |
| PostgreSQL | localhost:9432 | `psql -h localhost -p 9432 -U harmonize_admin -d harmonizeiq` |

### Step 3: Test APIs

```bash
# Windows PowerShell
(Invoke-WebRequest -Uri http://localhost:9001/health -UseBasicParsing).Content

# Mac/Linux
curl http://localhost:9001/health
```

### Step 4: Stop Services

```bash
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## 3. AWS Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS VPC                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │                   Public Subnets                       ││
│  │  ┌─────────────┐                                       ││
│  │  │     ALB     │ ◄─── Route 53 DNS                    ││
│  │  └──────┬──────┘                                       ││
│  └─────────┼──────────────────────────────────────────────┘│
│            │                                                │
│  ┌─────────▼──────────────────────────────────────────────┐│
│  │                   Private Subnets                      ││
│  │  ┌───────────────────────────────────────────────────┐ ││
│  │  │              ECS Fargate Cluster                  │ ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐             │ ││
│  │  │  │Frontend │ │ Backend │ │   NLP   │             │ ││
│  │  │  │  Task   │ │  Task   │ │  Task   │             │ ││
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

### Step 1: Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter region: us-east-1
# Enter output format: json
```

### Step 2: Deploy Infrastructure (CloudFormation)

```bash
cd aws/

# Set environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export DB_PASSWORD="YourSecurePassword123!"  # Change this!

# Deploy the stack
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name harmonizeiq-${ENVIRONMENT} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DBPassword=${DB_PASSWORD} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${AWS_REGION}

# Wait for completion (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name harmonizeiq-${ENVIRONMENT}
```

### Step 3: Get Stack Outputs

```bash
# Get all outputs
aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs" \
  --output table
```

Save these values:
- `ALBDNSName` - Your application URL
- `RDSEndpoint` - Database connection string
- `FrontendRepositoryUri` - ECR repo for frontend
- `BackendRepositoryUri` - ECR repo for backend
- `NLPServiceRepositoryUri` - ECR repo for NLP

### Step 4: Login to ECR

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
```

### Step 5: Build and Push Docker Images

```bash
# Get repository URIs
FRONTEND_REPO=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" \
  --output text)

BACKEND_REPO=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='BackendRepositoryUri'].OutputValue" \
  --output text)

NLP_REPO=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='NLPServiceRepositoryUri'].OutputValue" \
  --output text)

# Build and push Frontend
cd frontend
docker build -t harmonizeiq-frontend .
docker tag harmonizeiq-frontend:latest ${FRONTEND_REPO}:latest
docker push ${FRONTEND_REPO}:latest
cd ..

# Build and push Backend
cd backend
docker build -t harmonizeiq-backend .
docker tag harmonizeiq-backend:latest ${BACKEND_REPO}:latest
docker push ${BACKEND_REPO}:latest
cd ..

# Build and push NLP Service (this takes longer)
cd nlp-service
docker build -f Dockerfile.pytorch-base -t harmonizeiq-nlp .
docker tag harmonizeiq-nlp:latest ${NLP_REPO}:latest
docker push ${NLP_REPO}:latest
cd ..
```

### Step 6: Initialize Database

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

# Connect and run schema (requires bastion host or VPN)
psql -h ${RDS_ENDPOINT} -U harmonize_admin -d harmonizeiq -f database/schema.sql
psql -h ${RDS_ENDPOINT} -U harmonize_admin -d harmonizeiq -f database/seed.sql
```

### Step 7: Create ECS Services

```bash
# Create ECS services via AWS Console or CLI
# Navigate to: ECS → Clusters → harmonizeiq-cluster-production → Create Service
```

### Step 8: Configure DNS (Route 53)

1. Go to Route 53 → Hosted Zones
2. Create A record (Alias) pointing to ALB
3. Request SSL certificate in ACM
4. Update ALB listener to use HTTPS

### AWS Estimated Costs

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 3 tasks (0.5 vCPU, 1GB) | ~$50 |
| RDS PostgreSQL | db.t3.medium | ~$30 |
| ALB | Standard | ~$20 |
| ECR | Image storage | ~$5 |
| CloudWatch | Logs & monitoring | ~$10 |
| **Total** | | **~$115/month** |

---

## 4. Vercel + Railway Deployment

This option is simpler and good for demos/MVPs.

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│    Railway      │────▶│    Railway      │
│   (Frontend)    │     │   (Backend)     │     │  (PostgreSQL)   │
│   React App     │     │   Node.js API   │     │   + pgvector    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │     Railway     │
                        │  (NLP Service)  │
                        │    FastAPI      │
                        └─────────────────┘
```

### Step 1: Deploy Database (Railway)

1. Go to [railway.app](https://railway.app/)
2. Create new project
3. Add PostgreSQL service
4. Enable pgvector extension:

```sql
-- In Railway PostgreSQL console
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

5. Run schema:
```sql
-- Copy contents of database/schema.sql
-- Copy contents of database/seed.sql
```

6. Note your connection string:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

### Step 2: Deploy Backend (Railway)

1. In Railway project, click "New Service"
2. Select "GitHub Repo" → Select your repo
3. Set root directory: `backend`
4. Add environment variables:

```
PORT=9001
NODE_ENV=production
DB_HOST=<railway-postgres-host>
DB_PORT=<railway-postgres-port>
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<railway-postgres-password>
NLP_SERVICE_URL=<nlp-service-url>
CORS_ORIGIN=<vercel-frontend-url>
```

5. Railway will auto-deploy on git push

### Step 3: Deploy NLP Service (Railway)

1. Add another service in Railway
2. Select "GitHub Repo" → Select your repo
3. Set root directory: `nlp-service`
4. Set Dockerfile: `Dockerfile.cpu-optimized`
5. Add environment variables:

```
PYTHONUNBUFFERED=1
```

6. Note the deployed URL

### Step 4: Deploy Frontend (Vercel)

#### Option A: Vercel CLI

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? harmonizeiq
# - Directory? ./
# - Override settings? No
```

#### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com/)
2. Click "Import Project"
3. Select your GitHub repo
4. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Add environment variables:

```
VITE_API_URL=https://your-railway-backend.railway.app
```

6. Deploy!

### Step 5: Update CORS

In Railway backend, update `CORS_ORIGIN`:
```
CORS_ORIGIN=https://harmonizeiq.vercel.app
```

### Vercel + Railway Estimated Costs

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Vercel | Hobby (Free) | $0 |
| Railway Backend | Starter | ~$5 |
| Railway NLP | Starter | ~$10 |
| Railway PostgreSQL | Starter | ~$5 |
| **Total** | | **~$20/month** |

---

## 5. Environment Variables

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `9001` |
| `NODE_ENV` | Environment | `production` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `harmonizeiq` |
| `DB_USER` | Database user | `harmonize_admin` |
| `DB_PASSWORD` | Database password | `secret` |
| `NLP_SERVICE_URL` | NLP service URL | `http://localhost:9002` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:9000` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:9001` |

### NLP Service Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PYTHONUNBUFFERED` | Unbuffered output | `1` |

---

## 6. Post-Deployment Checklist

### Functionality Tests

- [ ] Frontend loads without errors
- [ ] Can upload CSV files (catalog, retailer, sales)
- [ ] Processing generates matches
- [ ] HITL review page shows pending matches
- [ ] Can approve/reject matches
- [ ] Export APIs return data
- [ ] Swagger docs accessible

### Security Checklist

- [ ] Database password changed from default
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured correctly
- [ ] No sensitive data in logs
- [ ] Environment variables secured

### Monitoring Setup

- [ ] Health checks configured
- [ ] Log aggregation enabled
- [ ] Error alerting set up
- [ ] Performance monitoring active

### API Endpoints to Test

```bash
# Health Check
curl https://your-api-url/health

# API Overview
curl https://your-api-url/api

# Export Summary
curl https://your-api-url/api/export/analytics/summary

# Swagger Docs
# Open in browser: https://your-api-url/docs
```

---

## 7. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker logs <container>` |
| Database connection failed | Verify credentials and network access |
| NLP service slow | First request loads model (~30s) |
| CORS errors | Update CORS_ORIGIN in backend |
| 502 Bad Gateway | Service is starting, wait 30s |

### Useful Commands

```bash
# Docker logs
docker logs harmonizeiq-backend --tail 100

# AWS ECS logs
aws logs tail /ecs/harmonizeiq-backend-production --follow

# Railway logs
railway logs

# Vercel logs
vercel logs
```

---

## 8. Rollback Procedures

### Docker Compose
```bash
# Restore previous version
docker-compose down
git checkout HEAD~1
docker-compose up -d --build
```

### AWS ECS
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster harmonizeiq-cluster-production \
  --service harmonizeiq-backend \
  --task-definition harmonizeiq-backend:PREVIOUS_VERSION
```

### Vercel
```bash
# Rollback to previous deployment
vercel rollback
```

---

*Document Version: 2.0*  
*Last Updated: January 2026*
