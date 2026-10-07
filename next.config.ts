import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.0.0.204'],
  serverExternalPackages: ['@prisma/client', '@prisma/engines'],

  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig
