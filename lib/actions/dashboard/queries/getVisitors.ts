import prisma from '@/prisma/client'

export async function getVisitors() {
  const visitors = await prisma.visitor.findMany({
    where: { visitDate: { gte: new Date() } },
    orderBy: { visitDate: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      visitDate: true,
      createdAt: true,
      invitedBy: { select: { name: true } }
    }
  })

  return visitors
}
