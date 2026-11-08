import { POLL_EVENT, pollChannel } from '@/lib/constants/poll.constants'
import { pusher } from '@/lib/pusher/pusher'
import prisma from '@/prisma/client'
import { PollResults } from '@/types/poll.types'

export async function broadcast(pollId: string) {
  const p = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      status: true,
      options: { orderBy: { order: 'asc' }, select: { id: true, label: true, _count: { select: { votes: true } } } }
    }
  })
  if (!p) return
  const options = p.options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes }))
  const payload: PollResults = {
    pollId,
    status: p.status,
    options,
    totalVotes: options.reduce((n, o) => n + o.votes, 0)
  }
  await pusher.trigger(pollChannel(pollId), POLL_EVENT, payload).catch(() => {})
}
