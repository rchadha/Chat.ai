# ─── Origin Access Identity for S3 ───────────────────────────────────────────

resource "aws_cloudfront_origin_access_identity" "static_assets" {
  comment = "${var.project_name} static assets OAI"
}

# ─── Custom Cache Policies ───────────────────────────────────────────────────

# Static assets: 1 year TTL (immutable)
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.project_name}-static-assets"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# Image optimization: 30-day default, forwards query strings
resource "aws_cloudfront_cache_policy" "image_optimization" {
  name        = "${var.project_name}-image-optimization"
  min_ttl     = 86400    # 1 day
  default_ttl = 2592000  # 30 days
  max_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

# ─── Local values for Lambda origin domains ──────────────────────────────────

locals {
  next_server_origin_domain = replace(replace(aws_lambda_function_url.next_server.function_url, "https://", ""), "/", "")
  image_optimization_origin_domain = replace(replace(aws_lambda_function_url.image_optimization.function_url, "https://", ""), "/", "")
}

# ─── CloudFront Distribution ────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Chat.ai Next.js Application"
  default_root_object = ""
  price_class         = "PriceClass_All"

  # Origin 1: Lambda server (default)
  origin {
    domain_name = local.next_server_origin_domain
    origin_id   = "lambda-server"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 static assets
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "s3-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static_assets.cloudfront_access_identity_path
    }
  }

  # Origin 3: Image optimization Lambda
  origin {
    domain_name = local.image_optimization_origin_domain
    origin_id   = "lambda-image-optimization"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior → Lambda server (no caching)
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "lambda-server"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled managed policy

    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # /_next/static/* → S3 (immutable cache)
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id
  }

  # /public/* → S3 (standard cache)
  ordered_cache_behavior {
    path_pattern           = "/public/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-static"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized managed policy
  }

  # /_next/image* → Image optimization Lambda (30-day cache)
  ordered_cache_behavior {
    path_pattern           = "/_next/image*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "lambda-image-optimization"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.image_optimization.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
