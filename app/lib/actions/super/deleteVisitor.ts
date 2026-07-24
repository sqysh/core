'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'
import { buildLogMessage, getRequestContext } from '../../utils/log.utils'
import { getActor } from '../user/getActor'
import { createLog } from '../../utils/api/createLog'

export async function deleteVisitor({ id }: { id: string }): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (session.user.role !== 'SUPER_USER') {
    return { success: false, error: 'Unauthorized' }
  }

  const [context, actor] = await Promise.all([
    getRequestContext().catch(() => null),
    getActor(session).catch(() => 'Unknown')
  ])

  try {
    const visitor = await prisma.visitor.delete({
      where: { id },
      select: { firstName: true, lastName: true, company: true }
    })

    if (context) {
      const logMessage = await buildLogMessage(
        `deleted visitor ${visitor.firstName} ${visitor.lastName} (${visitor.company})`,
        actor,
        context
      )
      await createLog('info', logMessage, {
        action: 'DELETE_VISITOR',
        entityId: id,
        userId: session.user.id
      }).catch(() => null)
    }

    return { success: true }
  } catch (err) {
    if (context) {
      const logMessage = await buildLogMessage(`failed to delete visitor ${id}`, actor, context).catch(
        () => `${actor} failed to delete visitor ${id}`
      )
      await createLog('error', logMessage, {
        action: 'DELETE_VISITOR',
        entityId: id,
        userId: session.user.id
      }).catch(() => null)
    }

    return { success: false, error: 'Failed to delete visitor.' }
  }
}
