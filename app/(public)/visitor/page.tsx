'use server'

import prisma from '@/prisma/client'
import VisitorClient from './VisitorClient'

export interface GroupStats {
  totalRevenue: number
  totalParleys: number
  totalReferrals: number
}

export async function getGroupStats(): Promise<{
  success: boolean
  data?: GroupStats
  error?: string
}> {
  try {
    const [anchors, totalParleys, totalReferrals] = await Promise.all([
      prisma.anchor
        .findMany({
          select: { businessValue: true }
        })
        .catch(() => []),
      prisma.parley
        .count({
          where: { status: { not: 'CANCELLED' } }
        })
        .catch(() => 0),
      prisma.treasureMap.count({}).catch(() => 0)
    ])

    const totalRevenue = anchors.map((a) => parseFloat(String(a.businessValue))).reduce((sum, val) => sum + val, 0)

    return {
      success: true,
      data: { totalRevenue, totalParleys, totalReferrals }
    }
  } catch (err) {
    console.error('[getGroupStats]', err)
    return { success: false, error: 'Failed to load group stats' }
  }
}

export default async function VisitorDayPage() {
  const result = await getGroupStats()
  return (
    <VisitorClient
      date="Thursday, May 7th"
      presenterName="Zach Ayvazian"
      presenterCompany="SureWay AI"
      presenterBio="Zach Ayvazian builds custom automations that free service businesses from the admin work that's quietly running them — from speed-to-lead systems to document automation and billing workflows."
      stats={result.data}
    />
  )
}
