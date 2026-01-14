#!/bin/bash
# HarmonizeIQ AWS Deployment Script

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
ENVIRONMENT=${ENVIRONMENT:-production}
STACK_NAME="harmonizeiq-${ENVIRONMENT}"
DB_PASSWORD=${DB_PASSWORD:-"ChangeMe123!"}

echo "🚀 HarmonizeIQ AWS Deployment"
echo "============================="
echo "Region: ${AWS_REGION}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first."
    exit 1
fi

# Step 1: Deploy CloudFormation Stack
echo "📦 Step 1: Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name ${STACK_NAME} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        DBPassword=${DB_PASSWORD} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${AWS_REGION}

echo "✅ CloudFormation stack deployed"

# Get outputs
echo "📝 Getting stack outputs..."
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" \
    --output text \
    --region ${AWS_REGION})

FRONTEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendRepositoryUri'].OutputValue" \
    --output text \
    --region ${AWS_REGION})

BACKEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='BackendRepositoryUri'].OutputValue" \
    --output text \
    --region ${AWS_REGION})

NLP_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='NLPServiceRepositoryUri'].OutputValue" \
    --output text \
    --region ${AWS_REGION})

# Step 2: Build and push Docker images
echo ""
echo "🐳 Step 2: Building and pushing Docker images..."

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${FRONTEND_REPO%%/*}

# Build and push Frontend
echo "Building frontend..."
cd ../frontend
docker build -t harmonizeiq-frontend .
docker tag harmonizeiq-frontend:latest ${FRONTEND_REPO}:latest
docker push ${FRONTEND_REPO}:latest

# Build and push Backend
echo "Building backend..."
cd ../backend
docker build -t harmonizeiq-backend .
docker tag harmonizeiq-backend:latest ${BACKEND_REPO}:latest
docker push ${BACKEND_REPO}:latest

# Build and push NLP Service
echo "Building NLP service..."
cd ../nlp-service
docker build -t harmonizeiq-nlp .
docker tag harmonizeiq-nlp:latest ${NLP_REPO}:latest
docker push ${NLP_REPO}:latest

echo "✅ Docker images pushed to ECR"

# Step 3: Deploy ECS Services (simplified - in production use task definitions)
echo ""
echo "🎯 Step 3: Note - ECS Task Definitions need to be created manually or via additional scripts"

echo ""
echo "============================="
echo "✅ Deployment Complete!"
echo "============================="
echo ""
echo "Application URL: http://${ALB_DNS}"
echo ""
echo "Next steps:"
echo "1. Create ECS Task Definitions for each service"
echo "2. Create ECS Services pointing to the task definitions"
echo "3. Configure DNS (Route 53) for custom domain"
echo "4. Enable HTTPS with ACM certificate"
echo "5. Run database migrations"
