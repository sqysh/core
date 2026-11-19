import { ActivityType } from '@/types/dashboard.types'
import { fetchRecentActivity } from '@/lib/actions/dashboard/queries/fetchRecentActivity'
import { timeAgo } from './date.utils'

/**
 * Format a recent activity item into a unified shape with a human-readable label
 * showing direction (giver → receiver or receiver ← giver from this user's POV).
 */
export function formatRecentActivity(
  userId: string,
  oneTwoOnes: Awaited<ReturnType<typeof fetchRecentActivity>>['recentOneTwoOnes'],
  maps: Awaited<ReturnType<typeof fetchRecentActivity>>['recentMaps'],
  closedBusinesses: Awaited<ReturnType<typeof fetchRecentActivity>>['recentClosedBusinesses']
) {
  return [
    ...oneTwoOnes.map((p) => ({
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
    ...closedBusinesses.map((a) => ({
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
