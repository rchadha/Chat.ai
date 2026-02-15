# ─── Secrets Manager ─────────────────────────────────────────────────────────

# Clerk

resource "aws_secretsmanager_secret" "clerk" {
  name        = "${var.project_name}/clerk"
  description = "Clerk authentication keys"
}

resource "aws_secretsmanager_secret_version" "clerk" {
  secret_id = aws_secretsmanager_secret.clerk.id

  secret_string = jsonencode({
    publishable_key = var.clerk_publishable_key
    secret_key      = var.clerk_secret_key
  })
}

# OpenAI

resource "aws_secretsmanager_secret" "openai" {
  name        = "${var.project_name}/openai"
  description = "OpenAI API key"
}

resource "aws_secretsmanager_secret_version" "openai" {
  secret_id = aws_secretsmanager_secret.openai.id

  secret_string = jsonencode({
    api_key = var.openai_api_key
  })
}
