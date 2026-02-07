#!/bin/bash
set -e

echo "🏗️  Building Next.js application for Lambda..."

# Build the Next.js app with OpenNext
npm run build:lambda

echo "📦 Packaging Lambda function..."

# Create zip file for Lambda function
cd .open-next/server-function
zip -r ../server-function.zip . > /dev/null
cd ../..

echo "✅ Build complete!"
echo ""
echo "📁 Output files:"
echo "  - Lambda function: .open-next/server-function.zip"
echo "  - Static assets: .open-next/assets/"
echo ""
echo "Next steps:"
echo "  1. Copy terraform.tfvars.example to terraform.tfvars and update values"
echo "  2. Run: cd terraform && terraform init"
echo "  3. Run: terraform plan"
echo "  4. Run: terraform apply"
echo "  5. Upload static assets to S3 (see deploy.sh)"
