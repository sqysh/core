import { HOST_ROLES } from '@/lib/constants/roles.constants'
import { PollRow, PollView } from '@/types/poll.types'

export function toView(p: PollRow, viewer: { id: string; role: string }): PollView {
  const options = p.options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes }))
  return {
    id: p.id,
    question: p.question,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    closedAt: p.closedAt?.toISOString() ?? null,
    createdBy: { id: p.createdBy.id, name: p.createdBy.name ?? '' },
    options,
    totalVotes: p.votes.length,
    myOptionId: p.votes.find((v) => v.userId === viewer.id)?.optionId ?? null,
    canClose: p.createdBy.id === viewer.id || HOST_ROLES.has(viewer.role)
  }
}

export const pollSelect = {
  id: true,
  question: true,
  status: true,
  createdAt: true,
  closedAt: true,
  createdBy: { select: { id: true, name: true } },
  options: {
    orderBy: { order: 'asc' as const },
    select: { id: true, label: true, _count: { select: { votes: true } } }
  },
  votes: { select: { userId: true, optionId: true } }
}
