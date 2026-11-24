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

  // The World Builder's route handlers (/dev/harbor-builder/api/* and /scene) read the model library and scene files
  // from disk, but only in development: in production they answer 404, and the models are served as static files from
  // public/, never through a function. File tracing can't tell which files a directory scan will touch, so it packs the
  // whole of public/ (the GLB library, 1.7 GB) into the function, past Vercel's 250 MB limit. No production route reads
  // public/ at runtime, so the development routes are traced without it. (scripts/check-function-size.mjs, part of
  // `npm run check`, fails the build if any function grows past the limit again.)
  outputFileTracingExcludes: {
    '/dev/**': ['./public/**/*']
  },

  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig
