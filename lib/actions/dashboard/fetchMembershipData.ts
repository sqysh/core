import prisma from '@/prisma/client'

export function fetchMembershipData(userId: string) {
  return prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        orders: {
          where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
          select: { type: true, currentPeriodEnd: true }
        },
        paymentMethods: {
          where: { isDefault: true },
          select: {
            id: true,
            brand: true,
            last4: true,
            expMonth: true,
            expYear: true,
            stripePaymentMethodId: true
          },
          take: 1
        }
      }
    })
    .catch(() => null)
}
