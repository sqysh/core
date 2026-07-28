import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import SuperDashboardClient from './SuperDashboardClient'

export const dynamic = 'force-dynamic'

const ANNUAL_PRICE = 365
const QUARTERLY_PRICE = 60

function sumBy(orders: { amount: number; type: string }[], type?: string) {
  return orders.filter((o) => !type || o.type === type).reduce((s, o) => s + o.amount, 0)
}

function inPeriod<T extends { createdAt: Date }>(orders: T[], start: Date) {
  return orders.filter((o) => o.createdAt >= start)
}

export default async function SuperDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'SUPER_USER') redirect('/dashboard')

  const now = new Date()
  const year = now.getFullYear()
  const quarterStart = new Date(year, Math.floor(now.getMonth() / 3) * 3, 1)
  const yearStart = new Date(year, 0, 1)

  const [allOrders, members] = await Promise.all([
    prisma.order.findMany({
      where: { chapterId, status: { in: ['ACTIVE', 'SCHEDULED', 'INCOMPLETE'] } },
      select: { amount: true, type: true, status: true, createdAt: true }
    }),
    prisma.user.findMany({
      where: { chapterId, membershipStatus: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        company: true,
        hasAnnualSubscription: true,
        hasQuarterlySubscription: true,
        stripeCustomerId: true,
        paymentMethods: {
          where: { isDefault: true },
          select: { last4: true, brand: true },
          take: 1
        },
        orders: {
          where: { status: 'ACTIVE', currentPeriodStart: { not: null } },
          select: { amount: true, type: true, createdAt: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  ])

  const mapped = allOrders.map((o) => ({ ...o, amount: Number(o.amount) }))

  const byStatus = (status: string) => mapped.filter((o) => o.status === status)
  const active = byStatus('ACTIVE')
  const scheduled = byStatus('SCHEDULED')
  const incomplete = byStatus('INCOMPLETE')

  const makeBlock = (orders: typeof mapped) => ({
    total: sumBy(orders),
    annual: sumBy(orders, 'ANNUAL'),
    quarterly: sumBy(orders, 'QUARTERLY'),
    ytd: sumBy(inPeriod(orders, yearStart)),
    qtd: sumBy(inPeriod(orders, quarterStart)),
    count: orders.length
  })

  // Monthly revenue for the current year (active orders only)
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const monthOrders = active.filter((o) => {
      const d = new Date(o.createdAt)
      return d.getFullYear() === year && d.getMonth() === i
    })
    return {
      month: new Date(year, i).toLocaleString('en-US', { month: 'short' }),
      revenue: sumBy(monthOrders),
      annual: sumBy(monthOrders, 'ANNUAL'),
      quarterly: sumBy(monthOrders, 'QUARTERLY')
    }
  })

  // MRR / ARR from live subscription flags
  const annualCount = members.filter((m) => m.hasAnnualSubscription).length
  const quarterlyCount = members.filter((m) => m.hasQuarterlySubscription).length
  const mrr = Math.round((annualCount * ANNUAL_PRICE) / 12 + (quarterlyCount * QUARTERLY_PRICE) / 3)
  const arr = mrr * 12

  // Per-member revenue breakdown
  const memberRevenue = members
    .map((m) => {
      const orders = m.orders.map((o) => ({ ...o, amount: Number(o.amount) }))
      return {
        id: m.id,
        name: m.name,
        company: m.company,
        hasSavedCard: m.paymentMethods.length > 0,
        savedCard: m.paymentMethods[0] ?? null,
        hasAnnual: m.hasAnnualSubscription,
        hasQuarterly: m.hasQuarterlySubscription,
        totalPaid: sumBy(orders),
        annualPaid: sumBy(orders, 'ANNUAL'),
        quarterlyPaid: sumBy(orders, 'QUARTERLY')
      }
    })
    .sort((a, b) => b.totalPaid - a.totalPaid)

  return (
    <SuperDashboardClient
      stats={{
        activeMembers: members.length,
        mrr,
        arr,
        active: makeBlock(active),
        scheduled: makeBlock(scheduled),
        incomplete: makeBlock(incomplete),
        combined: makeBlock(mapped),
        monthlyRevenue,
        memberRevenue,
        annualCount,
        quarterlyCount
      }}
    />
  )
}
