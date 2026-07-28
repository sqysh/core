import { ActivityType } from '@/types/dashboard.types'
import { fetchRecentActivity } from '../actions/dashboard/fetchRecentActivity'
import { timeAgo } from './date.utils'

/**
 * Format a recent activity item into a unified shape with a human-readable label
 * showing direction (giver → receiver or receiver ← giver from this user's POV).
 */
export function formatRecentActivity(
  userId: string,
  parleys: Awaited<ReturnType<typeof fetchRecentActivity>>['recentParleys'],
  maps: Awaited<ReturnType<typeof fetchRecentActivity>>['recentMaps'],
  anchors: Awaited<ReturnType<typeof fetchRecentActivity>>['recentAnchors']
) {
  return [
    ...parleys.map((p) => ({
      id: p.id,
      type: 'MEETING' as ActivityType,
      label:
        p.requesterId === userId
          ? `Face-2-Face · You → ${p.recipient.name}`
          : `Face-2-Face · ${p.requester.name} → You`,
      createdAt: p.createdAt
    })),
    ...maps.map((m) => ({
      id: m.id,
      type: 'REFERRAL' as ActivityType,
      label:
        m.giverId === userId
          ? `Referral · You → ${m.receiver.name} · ${m.clientName}`
          : `Referral · ${m.giver.name} → You · ${m.clientName}`,
      clientPhone: m.clientPhone ?? null,
      createdAt: m.createdAt
    })),
    ...anchors.map((a) => ({
      id: a.id,
      type: 'CLOSED' as ActivityType,
      label:
        a.receiverId === userId
          ? `Closed · ${a.giver?.name ?? 'External'} → You · $${Number(a.businessValue).toLocaleString()}`
          : `Closed · You → ${a.receiver?.name ?? 'External'} · $${Number(a.businessValue).toLocaleString()}`,
      businessValue: Number(a.businessValue),
      createdAt: a.createdAt
    }))
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((a) => ({
      ...a,
      timeAgo: timeAgo(a.createdAt.toISOString()),
      createdAt: a.createdAt.toISOString()
    }))
}
