'use server'

import prisma from '@/prisma/client'
import { auth } from '../../auth'

export type LogEntry = {
  id: string
  level: string
  message: string
  metadata: Record<string, unknown> | null
  userId: string | null
  userName: string | null
  createdAt: string
}

export type LogFilters = {
  level?: string
  search?: string
  page?: number
}

const PAGE_SIZE = 50

export type LogsByLevel = {
  error: LogEntry[]
  warning: LogEntry[]
  info: LogEntry[]
  debug: LogEntry[]
}

export async function getLogs(filters: LogFilters = {}): Promise<{
  success: boolean
  data?: { logs: LogEntry[]; byLevel: LogsByLevel; total: number; page: number; totalPages: number }
  error?: string
}> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }

    const page = filters.page ?? 1
    const skip = (page - 1) * PAGE_SIZE

    const where = {
      ...(filters.level && filters.level !== 'all' ? { level: filters.level } : {}),
      ...(filters.search
        ? {
            OR: [
              { message: { contains: filters.search, mode: 'insensitive' as const } },
              { metadata: { path: [], string_contains: filters.search } }
            ]
          }
        : {})
    }

    const serialize = (l: {
      id: string
      level: string
      message: string
      metadata: unknown
      userId: string | null
      createdAt: Date
      user: { name: string } | null
    }): LogEntry => ({
      id: l.id,
      level: l.level,
      message: l.message,
      metadata: l.metadata as Record<string, unknown> | null,
      userId: l.userId,
      userName: l.user?.name ?? null,
      createdAt: l.createdAt.toISOString()
    })

    const select = {
      id: true,
      level: true,
      message: true,
      metadata: true,
      userId: true,
      createdAt: true,
      user: { select: { name: true } }
    }

    // always fetch per-level for the column view
    const [logs, total, errorLogs, warningLogs, infoLogs, debugLogs] = await Promise.all([
      prisma.log.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE_SIZE, skip, select }),
      prisma.log.count({ where }),
      filters.level && filters.level !== 'all'
        ? Promise.resolve([])
        : prisma.log.findMany({
            where: { level: 'error', ...(filters.search ? where : {}) },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select
          }),
      filters.level && filters.level !== 'all'
        ? Promise.resolve([])
        : prisma.log.findMany({
            where: { level: 'warning', ...(filters.search ? where : {}) },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select
          }),
      filters.level && filters.level !== 'all'
        ? Promise.resolve([])
        : prisma.log.findMany({
            where: { level: 'info', ...(filters.search ? where : {}) },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select
          }),
      filters.level && filters.level !== 'all'
        ? Promise.resolve([])
        : prisma.log.findMany({
            where: { level: 'debug', ...(filters.search ? where : {}) },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select
          })
    ])

    return {
      success: true,
      data: {
        logs: logs.map(serialize),
        total,
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
        byLevel: {
          error: errorLogs.map(serialize),
          warning: warningLogs.map(serialize),
          info: infoLogs.map(serialize),
          debug: debugLogs.map(serialize)
        }
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to load logs' }
  }
}

export async function deleteLog(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
    await prisma.log.delete({ where: { id } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete log' }
  }
}

export async function clearLogs(level?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_USER') return { success: false, error: 'Unauthorized' }
    await prisma.log.deleteMany({ where: level ? { level } : {} })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to clear logs' }
  }
}
