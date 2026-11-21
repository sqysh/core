import type { NextConfig } from 'next'
import { networkInterfaces } from 'node:os'

/**
 * Phones on the same Wi-Fi may load the dev server: this Mac's current private network addresses (so it keeps working
 * when the router hands out a new one) and its Bonjour name (http://<name>.local:3000). Development only; production
 * ignores this.
 */
function lanDevOrigins() {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address)
    .filter((a) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a))
  return [...ips, '*.local']
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  serverExternalPackages: ['@prisma/client', '@prisma/engines'],

  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig
