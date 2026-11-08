import { PaymentMethod } from '@/src/generated/prisma/client'

interface Order {
  type: 'ANNUAL' | 'QUARTERLY'
  currentPeriodEnd: string | null
}

export interface MembershipSetupProps {
  membership: {
    annualOrder: Order | null
    quarterlyOrder: Order | null
    paymentMethod: PaymentMethod | null
  }
}
