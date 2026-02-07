This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Tech Stack and Libraries
### ShadCN  
We are using `shadcn` for building components which is built using RadixUI and Tailwind CSS.
https://ui.shadcn.com/docs/installation/next

### Clerk for authentication
We will be using clerk for authentication.
https://clerk.com


## Next.JS Notes
### Route Groups
There is something called route groups which allows you to create folders inside `/app` like `marketing` and but this name will not be part of navigation url. When you add folder `marketing` just make sure you add it with `()` and then it will not be part of url. So like this `(marketing)`.   
https://nextjs.org/docs/app/building-your-application/routing/route-groups

## AWS ECS Deployment

This application is configured to deploy on AWS ECS (Elastic Container Service) with Fargate.

### Infrastructure Setup

All infrastructure is managed with Terraform in the `/terraform` directory.

**What's included:**
- VPC with 2 public subnets in different availability zones
- Application Load Balancer (ALB)
- ECS Cluster with Fargate
- ECR (Elastic Container Registry) for Docker images
- Security groups and IAM roles
- CloudWatch logs

### Initial Deployment

1. **Install Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop

2. **Configure Terraform variables**
   - Edit `terraform/terraform.tfvars` with your environment variables
   - Set Clerk keys, OpenAI API key, and backend URLs

3. **Initialize and apply Terraform**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

4. **Login to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ECR_URL>
   ```

5. **Build and push Docker image**
   ```bash
   # Build for linux/amd64 platform (required for ECS Fargate)
   docker buildx build --platform linux/amd64 -t chat-ai-prod .

   # Tag the image
   docker tag chat-ai-prod:latest <YOUR_ECR_URL>:latest

   # Push to ECR
   docker push <YOUR_ECR_URL>:latest
   ```

6. **Deploy to ECS**
   ```bash
   aws ecs update-service --cluster chat-ai-cluster --service chat-ai-service --force-new-deployment --region us-east-1
   ```

Your application will be accessible at the ALB URL shown in Terraform outputs.

### Managing the Service

**Scale down to avoid charges (keeps infrastructure, stops containers):**
```bash
aws ecs update-service --cluster chat-ai-cluster --service chat-ai-service --desired-count 0 --region us-east-1
```

**Scale back up:**
```bash
aws ecs update-service --cluster chat-ai-cluster --service chat-ai-service --desired-count 1 --region us-east-1
```

**Completely destroy all infrastructure:**
```bash
cd terraform
terraform destroy
```

**Redeploy after destroying:**
```bash
cd terraform
terraform apply
# Then rebuild and push Docker image (steps 4-6 above)
```

### Costs

**When scaled down (0 tasks):**
- ALB: ~$16-18/month
- ECR storage: ~$0.10/GB/month
- VPC/Networking: Free (within free tier)

**When running (1 task with 256 CPU / 512 MB memory):**
- Fargate: ~$12-15/month
- Plus ALB and ECR costs above

### Troubleshooting

**Image platform error:**
- Make sure to build with `--platform linux/amd64` flag
- ECS Fargate requires AMD64 architecture

**Container won't start:**
- Check CloudWatch logs: `/ecs/chat-ai`
- Verify environment variables in `terraform/ecs.tf`

**Health check failing:**
- ALB health check is on path `/`
- Ensure Next.js is listening on port 3000

## TODO

- [ ] **Remove CDK and fix Terraform configuration** — Remove the `cdk/` directory and update Terraform to provision Lambda + CloudFront + S3 infrastructure (instead of the current ECS Fargate setup). The app is currently deployed on Lambda, so Terraform should match the actual architecture.
- [ ] **Replace deploy.sh with GitHub Actions** — Create a GitHub Actions CI/CD pipeline to handle building, packaging, and deploying to AWS (replacing the manual `scripts/deploy.sh` workflow).

