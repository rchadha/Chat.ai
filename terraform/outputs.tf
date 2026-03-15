# Outputs used by scripts/deploy.sh
output "s3_static_bucket" {
  description = "S3 bucket for static assets"
  value       = aws_s3_bucket.static_assets.id
}

output "lambda_function_name" {
  description = "Next.js server Lambda function name"
  value       = aws_lambda_function.next_server.function_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

# Additional outputs
output "image_optimization_function_name" {
  description = "Image optimization Lambda function name"
  value       = aws_lambda_function.image_optimization.function_name
}

output "next_server_function_url" {
  description = "Next.js server Lambda function URL"
  value       = aws_lambda_function_url.next_server.function_url
}

output "image_optimization_function_url" {
  description = "Image optimization Lambda function URL"
  value       = aws_lambda_function_url.image_optimization.function_url
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}
