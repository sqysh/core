// Which scanned codes count as CORE's meeting check-in code: the TV's own, and nothing else.
import assert from 'node:assert/strict'
import { isCheckInQr } from '@/lib/utils/checkInQr'

let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed++
  console.log('  ✓', name)
}

test('the code on the TV board and the harbor sign is recognised', () => {
  assert.equal(isCheckInQr('https://coastalreferralxchange.com/check-in'), true)
  assert.equal(isCheckInQr('https://www.coastalreferralxchange.com/check-in/'), true)
  assert.equal(isCheckInQr('  https://coastalreferralxchange.com/check-in  '), true)
})

test('a code for the development server counts only where that server is allowed', () => {
  assert.equal(isCheckInQr('https://10.0.0.204:3000/check-in'), false)
  assert.equal(isCheckInQr('https://10.0.0.204:3000/check-in', ['10.0.0.204:3000']), true)
})

test('other pages, sites, schemes and look-alikes are rejected', () => {
  for (const text of [
    'https://coastalreferralxchange.com/',
    'https://coastalreferralxchange.com/check-in/extra',
    'https://coastalreferralxchange.com/check-ins',
    'http://coastalreferralxchange.com/check-in',
    'https://evil.example/check-in',
    'https://coastalreferralxchange.com.evil.example/check-in',
    'https://user:pass@coastalreferralxchange.com/check-in',
    'javascript:alert(1)',
    'CORE-TEST-INVISIBLE-QR',
    ''
  ])
    assert.equal(isCheckInQr(text), false, text)
})

test('a date (or anything else) in the code is ignored, never used', () => {
  // still recognised, but the caller checks in to today's meeting regardless
  assert.equal(isCheckInQr('https://coastalreferralxchange.com/check-in?date=2020-01-02'), true)
})

console.log(`checkInQr: ${passed} passed`)
