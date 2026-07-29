import prisma from '@/prisma/client'

export async function getEvents() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      org: true,
      name: true,
      description: true,
      externalLink: true,
      createdAt: true,
      status: true
    }
  })

  return events
}
