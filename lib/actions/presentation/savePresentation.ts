'use server'

import { auth } from '@/lib/auth/auth'
import { chapterId } from '@/lib/constants/api/chapterId'
import { PresentationKind } from '@/lib/constants/stage.constants'
import { nextMeetingDate } from '@/lib/utils/date.utils'
import prisma from '@/prisma/client'
import { revalidatePath } from 'next/cache'

/**
 * Called after the file is already in Firebase Storage (client-side upload,
 * same path as profile photos). Replaces any existing deck for that meeting
 * by the same presenter.
 */
export async function savePresentation(input: {
  kind: PresentationKind
  fileUrl: string
  fileName: string
  pageCount?: number
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not signed in' }

  const { date: meetingDate } = await nextMeetingDate()

  try {
    const existing = await prisma.presentation.findUnique({
      where: { chapterId_meetingDate: { chapterId, meetingDate } },
      select: { presenterId: true }
    })
    if (existing && existing.presenterId !== session.user.id && session.user.role !== 'SUPER_USER') {
      return { success: false, error: 'Someone else already uploaded for this meeting' }
    }

    await prisma.presentation.upsert({
      where: { chapterId_meetingDate: { chapterId, meetingDate } },
      create: {
        chapterId,
        meetingDate,
        presenterId: session.user.id,
        kind: input.kind,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        pageCount: input.pageCount ?? null,
        notes: input.notes ?? null
      },
      update: {
        presenterId: session.user.id,
        kind: input.kind,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        pageCount: input.pageCount ?? null,
        notes: input.notes ?? null
      }
    })

    revalidatePath('/dashboard')
    revalidatePath('/stage/present')
    return { success: true }
  } catch {
    return { success: false, error: 'Could not save the presentation' }
  }
}
