export const ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID!
export const QUARTERLY_PRICE_ID = process.env.STRIPE_QUARTERLY_PRICE_ID!
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export const statusMap: Record<string, string> = {
  active: 'ACTIVE',
  past_due: 'PAST_DUE',
  canceled: 'CANCELLED',
  unpaid: 'PAST_DUE',
  incomplete: 'INCOMPLETE'
}
