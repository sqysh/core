'use server'

import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import VisitorDayClient from './VisitorDayClient'

export interface GroupStats {
  totalRevenue: number
  totalParleys: number
  totalReferrals: number
  reactionCount: number
}

async function getGroupStats(): Promise<GroupStats> {
  const today = new Date()

  const [anchors, totalParleys, totalReferrals, visitorDay] = await Promise.all([
    prisma.anchor.findMany({ where: { chapterId }, select: { businessValue: true } }),
    prisma.parley.count({ where: { chapterId, status: { not: 'CANCELLED' } } }),
    prisma.treasureMap.count({ where: { chapterId } }),
    prisma.visitorDay.findFirst({
      where: {
        chapterId,
        date: { gte: today }
      },
      orderBy: { date: 'asc' },
      select: {
        reactionCount: true,
        date: true,
        presenterName: true,
        presenterCompany: true
      }
    })
  ])

  const totalRevenue = anchors.reduce((sum, a) => sum + parseFloat(String(a.businessValue)), 0)

  return {
    totalRevenue,
    totalParleys,
    totalReferrals,
    reactionCount: visitorDay?.reactionCount ?? 0
  }
}

export default async function VisitorDayPage() {
  const [stats, visitorDay] = await Promise.all([
    getGroupStats(),
    prisma.visitorDay.findFirst({
      where: {
        chapterId,
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        presenterName: true,
        presenterCompany: true
      }
    })
  ])

  const date = visitorDay?.date
    ? new Date(visitorDay.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York'
      })
    : 'Thursday Morning'

  return (
    <VisitorDayClient
      date={date}
      presenterName={visitorDay?.presenterName ?? null}
      presenterCompany={visitorDay?.presenterCompany ?? null}
      isVisitorDay={!!visitorDay}
      stats={stats}
      initialReactionCount={stats.reactionCount}
    />
  )
}
