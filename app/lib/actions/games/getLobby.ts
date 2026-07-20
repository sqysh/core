'use server'

/** 
  Shared across all games. Returns members checked in for today's meeting.
  Mirrors getTodayAttendance exactly (local-time day range, same imports).
*/

import prisma from '@/prisma/client'
import { auth } from '@/app/lib/auth'
import { chapterId } from '@/app/lib/constants/api/chapterId'
import type { LobbyMember } from '@/types/game.types'
import { createLog } from '../../utils/api/createLog'

type Result = { success: true; data: LobbyMember[] } | { success: false; error: string }

export async function getLobby(): Promise<Result> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const meeting = await prisma.meeting
      .findFirst({
        where: { chapterId, date: { gte: start, lt: end } },
        select: {
          attendances: {
            orderBy: { createdAt: 'asc' },
            select: {
              user: {
                select: { id: true, name: true, profileImage: true, profileVideo: true }
              }
            }
          }
        }
      })
      .catch(() => null)

    if (!meeting) return { success: true, data: [] }

    const members: LobbyMember[] = meeting.attendances
      .map((a: { user: { id: any; name: any; profileImage: any; profileVideo: any } }) => ({
        userId: a.user.id,
        name: a.user.name ?? 'Member',
        profileImage: a.user.profileImage ?? null,
        profileVideo: a.user.profileVideo ?? null
      }))
      .filter((m: LobbyMember) => m.userId !== session.user.id)
      .sort((a: { name: string }, b: { name: any }) => a.name.localeCompare(b.name))

    return { success: true, data: members }
  } catch (error) {
    await createLog('error', 'getLobby failed', {
      name: 'GameGetLobbyError',
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error: 'Failed to load lobby' }
  }
}
