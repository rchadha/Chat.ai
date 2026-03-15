#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Chat.ai to AWS Lambda${NC}"
echo ""

# Check if .open-next directory exists
if [ ! -d ".open-next" ]; then
    echo "❌ Error: .open-next directory not found"
    echo "Please run: npm run build:lambda"
    exit 1
fi

# Check if Terraform is initialized
if [ ! -d "terraform/.terraform" ]; then
    echo -e "${BLUE}📦 Initializing Terraform...${NC}"
    cd terraform
    terraform init
    cd ..
fi

# Apply Terraform
echo -e "${BLUE}🏗️  Deploying infrastructure with Terraform...${NC}"
cd terraform
terraform apply

# Get outputs
S3_STATIC_BUCKET=$(terraform output -raw s3_static_bucket)
LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name)
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
cd ..

echo -e "${GREEN}✅ Infrastructure deployed!${NC}"
echo ""

# Upload static assets to S3
echo -e "${BLUE}📤 Uploading static assets to S3...${NC}"
aws s3 sync .open-next/assets s3://${S3_STATIC_BUCKET}/_next/static/ \
    --exclude "*.html" \
    --cache-control "public,max-age=31536000,immutable"

echo -e "${GREEN}✅ Static assets uploaded!${NC}"
echo ""

# Update Lambda function code
echo -e "${BLUE}🔄 Updating Lambda function...${NC}"
aws lambda update-function-code \
    --function-name ${LAMBDA_FUNCTION_NAME} \
    --zip-file fileb://.open-next/server-function.zip

echo -e "${GREEN}✅ Lambda function updated!${NC}"
echo ""

# Invalidate CloudFront cache
echo -e "${BLUE}🔄 Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
    --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
    --paths "/*"

echo -e "${GREEN}✅ CloudFront cache invalidated!${NC}"
echo ""

# Display deployment info
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
cd terraform
echo "🌐 Application URL: $(terraform output -raw cloudfront_url)"
cd ..
