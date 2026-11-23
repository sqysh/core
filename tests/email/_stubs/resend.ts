// The shared guarded clients, over a fake provider that records what would have been sent. The guard is the real one.
import { guardResend } from '@/lib/email/delivery'

const st = () => (globalThis as any).__emailTest

const provider = {
  emails: {
    send: async (payload: any, options?: any) => {
      st().sent.push({ payload, options })
      return { data: { id: `sent-${st().sent.length}` }, error: null }
    }
  },
  batch: { send: async () => ({ data: { data: [] }, error: null }) }
}

export const resend = guardResend(provider, { onEvent: () => {} })
export const authResend = guardResend(provider, { sandbox: false, onEvent: () => {} })
