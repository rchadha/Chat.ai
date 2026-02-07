variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "chat-ai"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# Lambda Configuration
variable "server_lambda_memory" {
  description = "Memory for the Next.js server Lambda (MB)"
  type        = number
  default     = 1024
}

variable "server_lambda_timeout" {
  description = "Timeout for the Next.js server Lambda (seconds)"
  type        = number
  default     = 30
}

variable "image_lambda_memory" {
  description = "Memory for the image optimization Lambda (MB)"
  type        = number
  default     = 2048
}

variable "image_lambda_timeout" {
  description = "Timeout for the image optimization Lambda (seconds)"
  type        = number
  default     = 30
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

# Environment Variables
variable "clerk_publishable_key" {
  description = "Clerk publishable key"
  type        = string
  sensitive   = true
}

variable "clerk_secret_key" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "app_url" {
  description = "Public application URL (CloudFront domain)"
  type        = string
}

variable "backend_api_url" {
  description = "Backend API URL"
  type        = string
  default     = "http://localhost:3001"
}

variable "backend_sql_api_url" {
  description = "Backend SQL API URL"
  type        = string
  default     = "http://localhost:3002"
}
