// Recognises CORE's meeting check-in QR code (the one on the TV board and the harbor sign: the /check-in page's
// address) in whatever a scanner read. Anything else is rejected: a scanned code is only ever compared, never opened.

/** Where CORE is served; a code pointing anywhere else is not ours */
export const CORE_HOSTS = ['coastalreferralxchange.com', 'www.coastalreferralxchange.com']

/**
 * Whether a scanned text is CORE's check-in code: an https (or same-site) address on CORE's own host (or `extraHosts`,
 * e.g. the development server's), whose path is /check-in. Its query is ignored on purpose: a scan always checks in to
 * today's meeting, so nothing in the code (such as a date) can be used to check in to another day.
 */
export function isCheckInQr(text: string, extraHosts: string[] = []): boolean {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.username || url.password) return false
  const hosts = [...CORE_HOSTS, ...extraHosts].map((h) => h.toLowerCase())
  if (!hosts.includes(url.host.toLowerCase()) && !hosts.includes(url.hostname.toLowerCase())) return false
  if (url.protocol === 'http:' && CORE_HOSTS.includes(url.hostname.toLowerCase())) return false
  return url.pathname.replace(/\/+$/, '') === '/check-in'
}
