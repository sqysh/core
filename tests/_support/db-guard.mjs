// Safeguards for the database integration tests. They only ever run against a database you name explicitly, never the
// app's DATABASE_URL by accident, and never when production signals are present. (The tests themselves also run every
// write inside a transaction that is always rolled back, and assert the row counts are unchanged afterwards.)
//
//   TEST_DATABASE_URL         the database to test against (a dev or branch database)
//   CONFIRM_TEST_DB_HOST      must equal that database's host name, so the target is a deliberate choice
//   PRODUCTION_DATABASE_HOSTS optional, comma-separated host names that are refused outright
import { loadEnvFile } from 'node:process'

const refuse = (why) => {
  console.error(`\nRefusing to run the database tests: ${why}\n`)
  process.exit(1)
}

export function prepareDatabase() {
  try {
    loadEnvFile('.env')
  } catch {
    // no .env: fine, everything needed can come from the shell
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.CI_DEPLOY) {
    refuse('this looks like a production or deploy environment')
  }

  const url = process.env.TEST_DATABASE_URL
  if (!url) refuse('set TEST_DATABASE_URL to the dev/branch database to test against (DATABASE_URL is never used)')

  let host
  try {
    host = new URL(url).hostname
  } catch {
    refuse('TEST_DATABASE_URL is not a valid URL')
  }

  const banned = (process.env.PRODUCTION_DATABASE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  if (banned.includes(host)) refuse(`${host} is listed in PRODUCTION_DATABASE_HOSTS`)
  if (/(^|[-_.])prod(uction)?([-_.]|$)/i.test(host)) refuse(`${host} looks like a production host`)

  if (process.env.CONFIRM_TEST_DB_HOST !== host) {
    refuse(`to confirm the target, also set CONFIRM_TEST_DB_HOST=${host}`)
  }

  // the app's prisma client reads DATABASE_URL: point it at the test database for this process only
  process.env.DATABASE_URL = url
  console.log(`Database tests will run against ${host} (all writes rolled back).`)
}
