# AWS Lambda Deployment Guide

This guide walks you through deploying your Next.js application to AWS Lambda using Terraform and OpenNext.

## Architecture Overview

```
┌─────────┐      ┌──────────────┐      ┌────────────────┐      ┌─────────────────┐
│  User   │─────▶│  CloudFront  │─────▶│ Lambda (SSR)   │─────▶│  ECS Backend    │
└─────────┘      └──────────────┘      └────────────────┘      │  (ports 3001/2) │
                        │                                       └─────────────────┘
                        ▼
                 ┌──────────┐
                 │  S3      │
                 │ (Static) │
                 └──────────┘
```

## Prerequisites

1. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

2. **Terraform** installed (v1.0+)
   ```bash
   brew install terraform  # macOS
   ```

3. **Node.js** 20.x or later
   ```bash
   node --version
   ```

4. **ECS Backend Services** deployed (for `BACKEND_API_URL` and `BACKEND_SQL_API_URL`)

## Step 1: Configure Environment Variables

1. Copy the Terraform variables example:
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

2. Edit `terraform/terraform.tfvars` with your values:
   ```hcl
   # AWS Configuration
   aws_region   = "us-east-1"
   project_name = "chat-ai"
   environment  = "prod"

   # Clerk Configuration (from https://dashboard.clerk.com)
   clerk_publishable_key = "pk_live_xxxxx"
   clerk_secret_key      = "sk_live_xxxxx"

   # OpenAI Configuration
   openai_api_key = "sk-xxxxx"

   # Backend Services - UPDATE THESE WITH YOUR ECS SERVICE URLS
   backend_api_url     = "http://internal-backend-alb.us-east-1.elb.amazonaws.com:3001"
   backend_sql_api_url = "http://internal-backend-alb.us-east-1.elb.amazonaws.com:3002"
   ```

   **Important:** Replace the `backend_api_url` and `backend_sql_api_url` with your actual ECS service internal load balancer URLs.

## Step 2: Build the Application

Build the Next.js application for Lambda:

```bash
npm run build:lambda
```

This will:
- Build your Next.js application
- Run OpenNext to convert it to Lambda-compatible format
- Create `.open-next/` directory with Lambda function and static assets

## Step 3: Deploy Infrastructure

### Option A: Automated Deployment (Recommended)

Run the deployment script:

```bash
./scripts/deploy.sh
```

This script will:
1. Initialize Terraform (if needed)
2. Apply Terraform configuration
3. Upload static assets to S3
4. Update Lambda function code
5. Invalidate CloudFront cache

### Option B: Manual Deployment

If you prefer manual control:

1. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

2. **Review the plan:**
   ```bash
   terraform plan
   ```

3. **Apply the configuration:**
   ```bash
   terraform apply
   ```

4. **Package Lambda function:**
   ```bash
   cd ../.open-next/server-function
   zip -r ../server-function.zip .
   cd ../..
   ```

5. **Get S3 bucket names and Lambda function name:**
   ```bash
   cd terraform
   export S3_STATIC_BUCKET=$(terraform output -raw s3_static_bucket)
   export LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name)
   export CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
   cd ..
   ```

6. **Upload static assets:**
   ```bash
   aws s3 sync .open-next/assets s3://${S3_STATIC_BUCKET}/_next/static/ \
       --cache-control "public,max-age=31536000,immutable"
   ```

7. **Update Lambda function:**
   ```bash
   aws lambda update-function-code \
       --function-name ${LAMBDA_FUNCTION_NAME} \
       --zip-file fileb://.open-next/server-function.zip
   ```

8. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
       --distribution-id ${CLOUDFRONT_ID} \
       --paths "/*"
   ```

## Step 4: Access Your Application

Get your application URL:

```bash
cd terraform
terraform output cloudfront_url
```

Visit the URL in your browser!

## Making Updates

When you make changes to your code:

```bash
# 1. Build the updated application
npm run build:lambda

# 2. Deploy updates
./scripts/deploy.sh
```

Or manually:
```bash
# Update Lambda function
cd .open-next/server-function
zip -r ../server-function.zip .
cd ../..

aws lambda update-function-code \
    --function-name $(cd terraform && terraform output -raw lambda_function_name) \
    --zip-file fileb://.open-next/server-function.zip

# Upload new static assets
aws s3 sync .open-next/assets \
    s3://$(cd terraform && terraform output -raw s3_static_bucket)/_next/static/ \
    --cache-control "public,max-age=31536000,immutable"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id $(cd terraform && terraform output -raw cloudfront_distribution_id) \
    --paths "/*"
```

## Custom Domain (Optional)

To use a custom domain:

1. **Create ACM certificate in `us-east-1`:**
   ```bash
   aws acm request-certificate \
       --domain-name chat.yourdomain.com \
       --validation-method DNS \
       --region us-east-1
   ```

2. **Validate the certificate** (follow ACM instructions to add DNS records)

3. **Update `terraform/terraform.tfvars`:**
   ```hcl
   domain_name     = "chat.yourdomain.com"
   certificate_arn = "arn:aws:acm:us-east-1:YOUR_ACCOUNT:certificate/CERT_ID"
   ```

4. **Apply Terraform changes:**
   ```bash
   cd terraform
   terraform apply
   ```

5. **Update DNS** to point to CloudFront:
   ```
   chat.yourdomain.com CNAME <cloudfront_domain_name>
   ```

## Monitoring & Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/$(cd terraform && terraform output -raw lambda_function_name) --follow
```

View CloudFront metrics in AWS Console:
- Go to CloudFront → Distributions → Your distribution → Monitoring

## Cost Estimation

With Lambda deployment:

- **Lambda**: Pay per request (~$0.20 per 1M requests)
- **CloudFront**: Data transfer (~$0.085/GB)
- **S3**: Storage (~$0.023/GB/month) + requests
- **Estimated**: ~$5-20/month for low-medium traffic

No idle costs when not in use!

## Troubleshooting

### Lambda function times out
- Ensure your ECS backend services are accessible from Lambda
- Check VPC configuration if backends are in private subnets
- Increase timeout in `terraform/lambda.tf` (currently 30s)

### 502 Bad Gateway
- Check Lambda logs for errors
- Verify environment variables are set correctly
- Ensure ECS backend URLs are correct and accessible

### Static assets not loading
- Verify S3 upload completed successfully
- Check CloudFront cache behavior configuration
- Try invalidating CloudFront cache

### Clerk authentication not working
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correct
- Check Clerk dashboard for allowed domains (add CloudFront domain)

## Clean Up

To destroy all resources:

```bash
cd terraform
terraform destroy
```

**Note:** This will delete all resources including S3 buckets and CloudFront distribution.

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
2. Add monitoring and alerting (CloudWatch Alarms)
3. Configure WAF for CloudFront (security)
4. Set up Route53 for DNS management
5. Add X-Ray tracing for Lambda debugging
