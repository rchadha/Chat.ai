/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://d3sipbt1248d5.cloudfront.net'
    : undefined,
  async rewrites() {
    return [
      {
        source: '/__clerk/:path*',
        destination: 'https://frontend-api.clerk.services/:path*',
      },
    ];
  },
}

module.exports = nextConfig
