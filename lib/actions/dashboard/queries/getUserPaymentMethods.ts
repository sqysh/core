import prisma from '@/prisma/client'

export async function getUserPaymentMethods(userId: string) {
  const paymentMethods = await prisma.paymentMethod.count({
    where: { userId }
  })

  return paymentMethods
}
