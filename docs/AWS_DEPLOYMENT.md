# HarmonizeIQ - AWS Deployment Guide

## 1. Overview

This guide covers deploying HarmonizeIQ to AWS using:
- **Amazon ECS (Fargate)** - Serverless container hosting
- **Amazon RDS** - Managed PostgreSQL with pgvector
- **Application Load Balancer** - Traffic distribution
- **Amazon ECR** - Container image registry

### Estimated Monthly Cost

| Service | Specification | Cost |
|---------|--------------|------|
| ECS Fargate | 3 tasks (0.5 vCPU, 1GB each) | ~$50 |
| RDS PostgreSQL | db.t3.medium | ~$30 |
| Application Load Balancer | Standard | ~$20 |
| ECR | Image storage | ~$5 |
| CloudWatch | Logs & monitoring | ~$10 |
| **Total** | | **~$115/month** |

---

## 2. Prerequisites

### 2.1 Required Tools

```bash
# AWS CLI
aws --version  # Should be 2.x

# Docker
docker --version  # Should be 20.x+

# Git
git --version
```

### 2.2 AWS Account Setup

1. Create an AWS account (if needed)
2. Create an IAM user with programmatic access
3. Configure AWS CLI:

```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1)
```

---

## 3. Infrastructure Deployment

### 3.1 Deploy CloudFormation Stack

```bash
cd aws/

# Set variables
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export DB_PASSWORD="YourSecurePassword123!"  # Change this!

# Deploy infrastructure
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name harmonizeiq-${ENVIRONMENT} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DBPassword=${DB_PASSWORD} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${AWS_REGION}
```

### 3.2 What Gets Created

| Resource | Description |
|----------|-------------|
| VPC | Isolated network with public/private subnets |
| RDS Instance | PostgreSQL 16 with pgvector |
| ECS Cluster | Fargate cluster for containers |
| ECR Repositories | 3 repos (frontend, backend, nlp) |
| ALB | Application Load Balancer |
| Security Groups | Network access rules |
| IAM Roles | ECS task execution roles |

### 3.3 Get Stack Outputs

```bash
# Get all outputs
aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs" \
  --output table

# Key outputs you'll need:
# - ALBDNSName: Your application URL
# - RDSEndpoint: Database connection string
# - FrontendRepositoryUri: ECR repo for frontend
# - BackendRepositoryUri: ECR repo for backend
# - NLPServiceRepositoryUri: ECR repo for NLP
```

---

## 4. Build & Push Docker Images

### 4.1 Login to ECR

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

### 4.2 Build and Push Images

```bash
# Get repository URIs from CloudFormation outputs
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

# Build and push Backend
cd ../backend
docker build -t harmonizeiq-backend .
docker tag harmonizeiq-backend:latest ${BACKEND_REPO}:latest
docker push ${BACKEND_REPO}:latest

# Build and push NLP Service
cd ../nlp-service
docker build -t harmonizeiq-nlp .
docker tag harmonizeiq-nlp:latest ${NLP_REPO}:latest
docker push ${NLP_REPO}:latest
```

---

## 5. Database Setup

### 5.1 Connect to RDS

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name harmonizeiq-production \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

# Connect via psql (from an EC2 bastion or local with VPN)
psql -h ${RDS_ENDPOINT} -U harmonize_admin -d harmonizeiq
```

### 5.2 Run Migrations

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Run schema (copy from database/schema.sql)
\i schema.sql

-- Run seed data
\i seed.sql
```

---

## 6. ECS Task Definitions

### 6.1 Create Task Definition (Console or CLI)

**Backend Task Definition:**

```json
{
  "family": "harmonizeiq-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/harmonizeiq-ecs-execution-production",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/harmonizeiq-backend-production:latest",
      "portMappings": [
        {
          "containerPort": 9001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "9001"},
        {"name": "DB_HOST", "value": "RDS_ENDPOINT"},
        {"name": "DB_PORT", "value": "5432"},
        {"name": "DB_NAME", "value": "harmonizeiq"},
        {"name": "DB_USER", "value": "harmonize_admin"},
        {"name": "NLP_SERVICE_URL", "value": "http://nlp-service.local:8000"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:harmonizeiq-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/harmonizeiq-backend-production",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 6.2 Create ECS Services

```bash
# Create Backend Service
aws ecs create-service \
  --cluster harmonizeiq-cluster-production \
  --service-name harmonizeiq-backend \
  --task-definition harmonizeiq-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=9001"
```

---

## 7. DNS & SSL Configuration

### 7.1 Custom Domain (Route 53)

1. Go to **Route 53 → Hosted Zones**
2. Create A record pointing to ALB:
   - Name: `harmonizeiq.yourdomain.com`
   - Type: A - Alias
   - Alias Target: Your ALB

### 7.2 SSL Certificate (ACM)

```bash
# Request certificate
aws acm request-certificate \
  --domain-name harmonizeiq.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

Then update ALB listener to use HTTPS on port 443.

---

## 8. Monitoring & Alerts

### 8.1 CloudWatch Dashboard

Create a dashboard with these widgets:
- ECS CPU/Memory utilization
- ALB request count
- ALB latency (p50, p95, p99)
- RDS connections
- Error rates (5xx)

### 8.2 Alerts to Configure

| Alert | Threshold | Action |
|-------|-----------|--------|
| ECS CPU High | > 80% for 5 min | Scale out |
| ECS Memory High | > 80% for 5 min | Scale out |
| ALB 5xx Errors | > 10/min | Investigate |
| RDS Storage | > 80% | Increase storage |
| RDS CPU | > 80% | Upgrade instance |

---

## 9. CI/CD Pipeline (Optional)

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push images
        run: |
          docker build -t $ECR_REPO:${{ github.sha }} ./backend
          docker push $ECR_REPO:${{ github.sha }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster harmonizeiq-cluster --service harmonizeiq-backend --force-new-deployment
```

---

## 10. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| ECS task won't start | Check CloudWatch logs, verify IAM roles |
| Can't connect to RDS | Check security groups, VPC routing |
| NLP service slow | Increase Fargate memory, pre-warm model |
| High latency | Add caching (ElastiCache), check queries |

### Useful Commands

```bash
# View ECS service events
aws ecs describe-services \
  --cluster harmonizeiq-cluster-production \
  --services harmonizeiq-backend

# View recent logs
aws logs tail /ecs/harmonizeiq-backend-production --follow

# Force new deployment
aws ecs update-service \
  --cluster harmonizeiq-cluster-production \
  --service harmonizeiq-backend \
  --force-new-deployment
```

---

## 11. Security Checklist

- [ ] Change default database password
- [ ] Enable RDS encryption at rest
- [ ] Configure VPC Flow Logs
- [ ] Enable CloudTrail
- [ ] Set up AWS WAF rules
- [ ] Configure secrets in Secrets Manager
- [ ] Enable MFA for AWS console
- [ ] Review IAM policies (least privilege)

---

## 12. Cleanup

To delete all resources:

```bash
# Delete ECS services first
aws ecs delete-service --cluster harmonizeiq-cluster-production --service harmonizeiq-backend --force
aws ecs delete-service --cluster harmonizeiq-cluster-production --service harmonizeiq-frontend --force
aws ecs delete-service --cluster harmonizeiq-cluster-production --service harmonizeiq-nlp --force

# Delete CloudFormation stack (deletes everything else)
aws cloudformation delete-stack --stack-name harmonizeiq-production
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*
