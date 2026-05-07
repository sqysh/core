import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function seed() {
  const annual = await stripe.products.create({ name: 'Annual Admission' })
  const annualPrice = await stripe.prices.create({
    product: annual.id,
    unit_amount: 36500, // $365.00 in cents
    currency: 'usd',
    recurring: { interval: 'year' }
  })

  const quarterly = await stripe.products.create({ name: 'Room Dues' })
  const quarterlyPrice = await stripe.prices.create({
    product: quarterly.id,
    unit_amount: 6000, // $60.00 in cents
    currency: 'usd',
    recurring: { interval: 'month', interval_count: 3 }
  })

  console.log('STRIPE_ANNUAL_PRICE_ID=', annualPrice.id)
  console.log('STRIPE_QUARTERLY_PRICE_ID=', quarterlyPrice.id)
}

seed()
