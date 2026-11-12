'use server'

import { ActionResult } from '@/types/action.types'
import { nextRoomDuesDate, ROOM_DUES_AMOUNT, TreasurerBoard } from '@/lib/constants/stage.constants'
import prisma from '@/prisma/client'
import { chapterId } from '@/lib/constants/api/chapterId'
import { createLog } from '@/lib/utils/api/createLog'

export async function getTreasurerBoard(): Promise<ActionResult<TreasurerBoard>> {
  try {
    const [members, treasury, obligations] = await Promise.all([
      prisma.user.findMany({
        where: { chapterId, membershipStatus: { in: ['ACTIVE', 'APPROVED'] } },
        select: { id: true, name: true, stripeCustomerId: true },
        orderBy: { name: 'asc' }
      }),
      prisma.chapterTreasury.findUnique({ where: { chapterId }, select: { bankBalance: true, updatedAt: true } }),
      prisma.treasuryObligation.findMany({
        where: { chapterId },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
      })
    ])

    const rows = members.map((m) => ({ id: m.id, name: m.name ?? '', hasCard: m.stripeCustomerId != null }))
    const withCard = rows.filter((r) => r.hasCard).length
    const due = nextRoomDuesDate()

    return {
      success: true,
      data: {
        balance: treasury ? Number(treasury.bankBalance) : null,
        updatedAt: treasury?.updatedAt?.toISOString() ?? null,
        members: rows,
        withCard,
        total: rows.length,
        roomDue: { amount: ROOM_DUES_AMOUNT, dueDate: due.toISOString() },
        obligations: obligations.map((o) => ({
          id: o.id,
          label: o.label,
          amount: Number(o.amount),
          dueDate: o.dueDate?.toISOString() ?? null
        }))
      }
    }
  } catch (err) {
    await createLog('error', 'getTreasurerBoard: failed', { err: String(err) })
    return { success: false, error: 'Could not load the treasurer board' }
  }
}
