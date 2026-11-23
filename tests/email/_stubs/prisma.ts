// An in-memory stand-in for the app's Prisma client, for running the real cron routes in tests. State lives on
// globalThis.__emailTest (tests set it up and read it back).
const st = () => (globalThis as any).__emailTest

const prisma: any = {
  user: {
    findMany: async () => {
      st().userQueries++
      return st().users
    }
  },
  log: {
    create: async ({ data }: any) => {
      const row = { id: `l${String(++st().seq).padStart(6, '0')}`, createdAt: st().seq, ...data }
      st().logs.push(row)
      return { id: row.id }
    },
    findFirst: async ({ where }: any) => {
      const rows = st().logs.filter((l: any) => l.message === where.message).sort((a: any, b: any) => a.createdAt - b.createdAt)
      return rows[0] ? { id: rows[0].id } : null
    },
    delete: async ({ where }: any) => {
      const i = st().logs.findIndex((l: any) => l.id === where.id)
      if (i >= 0) st().logs.splice(i, 1)
      return {}
    }
  },
  presenterQueue: {
    findMany: async () => st().queue,
    update: async () => ({})
  },
  cancelledMeeting: { findMany: async () => [] },
  visitorDay: { findMany: async () => [] },
  $transaction: async (fn: (tx: any) => unknown) => {
    st().transactions++
    return fn(prisma)
  }
}

export default prisma
