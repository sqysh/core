import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Native iOS shell for CORE (Capacitor). Everything native lives under ./native; the Next.js app is untouched.
 *
 * Development only: `npm run ios:dev` sets CORE_NATIVE_DEV_SERVER so the app loads the local `npm run dev:https` server.
 * Only HTTPS to this Mac (localhost / loopback) is accepted, so the app can never be pointed at production or at plain
 * HTTP this way, and certificate validation is left to iOS (the simulator trusts the local mkcert CA instead).
 * Without the variable, the app shows the bundled page in native/www. This is not the production architecture.
 */
function devServer() {
  const value = process.env.CORE_NATIVE_DEV_SERVER
  if (!value) return undefined
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error(`CORE_NATIVE_DEV_SERVER must be https (got ${url.protocol})`)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(`CORE_NATIVE_DEV_SERVER must be this Mac (localhost), not ${url.hostname}`)
  return { url: url.origin, cleartext: false }
}

const config: CapacitorConfig = {
  appId: 'com.sqysh.core',
  appName: 'CORE',
  webDir: 'native/www',
  backgroundColor: '#0d1727',
  server: devServer(),
  ios: {
    path: 'native/ios',
    contentInset: 'never',
    backgroundColor: '#0d1727',
  },
}

export default config
