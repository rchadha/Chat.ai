# Placeholder zip for initial Lambda creation
# After first deploy, Lambda code is updated via deploy.sh
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'placeholder' });"
    filename = "index.js"
  }
}

# ─── CloudWatch Log Groups ───────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "next_server" {
  name              = "/aws/lambda/${var.project_name}-next-server"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "image_optimization" {
  name              = "/aws/lambda/${var.project_name}-image-optimization"
  retention_in_days = 7
}

# ─── IAM Roles ───────────────────────────────────────────────────────────────

# Next.js server Lambda role
resource "aws_iam_role" "next_server_lambda" {
  name = "${var.project_name}-next-server-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "next_server_basic_execution" {
  role       = aws_iam_role.next_server_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Image optimization Lambda role
resource "aws_iam_role" "image_optimization_lambda" {
  name = "${var.project_name}-image-optimization-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "image_optimization_basic_execution" {
  role       = aws_iam_role.image_optimization_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "image_optimization_s3_read" {
  name = "${var.project_name}-image-optimization-s3-read"
  role = aws_iam_role.image_optimization_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

# ─── Lambda Functions ────────────────────────────────────────────────────────

resource "aws_lambda_function" "next_server" {
  function_name    = "${var.project_name}-next-server"
  role             = aws_iam_role.next_server_lambda.arn
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  memory_size      = var.server_lambda_memory
  timeout          = var.server_lambda_timeout
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
      CLERK_SECRET_KEY                  = var.clerk_secret_key
      OPENAI_API_KEY                    = var.openai_api_key
      NEXT_PUBLIC_CLERK_SIGN_IN_URL     = "/sign-in"
      NEXT_PUBLIC_CLERK_SIGN_UP_URL     = "/sign-up"
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = "/dashboard"
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = "/dashboard"
      CLERK_SIGN_IN_FALLBACK_REDIRECT_URL  = "/dashboard"
      CLERK_SIGN_UP_FALLBACK_REDIRECT_URL  = "/dashboard"
      NEXTAUTH_URL                       = var.app_url
      NEXT_PUBLIC_APP_URL                = var.app_url
      NODE_ENV                           = "production"
      BACKEND_API_URL                    = var.backend_api_url
      BACKEND_SQL_API_URL                = var.backend_sql_api_url
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [
    aws_cloudwatch_log_group.next_server,
    aws_iam_role_policy_attachment.next_server_basic_execution,
  ]
}

resource "aws_lambda_function" "image_optimization" {
  function_name    = "${var.project_name}-image-optimization"
  role             = aws_iam_role.image_optimization_lambda.arn
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  memory_size      = var.image_lambda_memory
  timeout          = var.image_lambda_timeout
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.static_assets.id
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [
    aws_cloudwatch_log_group.image_optimization,
    aws_iam_role_policy_attachment.image_optimization_basic_execution,
  ]
}

# ─── Lambda Function URLs ───────────────────────────────────────────────────

resource "aws_lambda_function_url" "next_server" {
  function_name      = aws_lambda_function.next_server.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_lambda_function_url" "image_optimization" {
  function_name      = aws_lambda_function.image_optimization.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

# ─── Lambda Permissions for Function URL ─────────────────────────────────────

resource "aws_lambda_permission" "next_server_function_url" {
  statement_id           = "AllowFunctionURLInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.next_server.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "image_optimization_function_url" {
  statement_id           = "AllowFunctionURLInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.image_optimization.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
