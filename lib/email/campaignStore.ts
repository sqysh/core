import prisma from '@/prisma/client'
import type { ClaimStore } from './campaign'

// Campaign-run claims, kept in the existing Log table (message = the claim key): no schema change. The database
// stamps `createdAt`, so every claimant is ordered by one clock (and by id when two land in the same instant).
export const prismaClaimStore: ClaimStore = {
  async insert(key) {
    const row = await prisma.log.create({ data: { level: 'info', message: key }, select: { id: true } })
    return row.id
  },
  async earliest(key) {
    const row = await prisma.log.findFirst({
      where: { message: key },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true }
    })
    return row?.id ?? null
  },
  async remove(id) {
    await prisma.log.delete({ where: { id } }).catch(() => {})
  }
}
