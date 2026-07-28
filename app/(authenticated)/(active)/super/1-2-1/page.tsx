import prisma from '@/prisma/client'
import { OneTwoOneClient } from './OneTwoOneClient'
import { chapterId } from '@/lib/constants/api/chapterId'

export default async function OneTwoOnePage() {
  const result = await prisma.parley
    .findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        notes: true,
        createdAt: true,
        requester: { select: { id: true, name: true, company: true } },
        recipient: { select: { id: true, name: true, company: true } }
      }
    })
    .catch(() => null)

  const oneTwoOnes = (result ?? []).map((p) => ({
    id: p.id,
    scheduledAt: p.scheduledAt.toISOString(),
    status: p.status,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    requester: p.requester,
    recipient: p.recipient
  }))

  return <OneTwoOneClient oneTwoOnes={oneTwoOnes} />
}
