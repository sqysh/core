import { EventStatus } from '@/src/generated/prisma/enums'

export type TEvent = {
  id: string
  org: 'LYNN_CHAMBER' | 'NORTH_SHORE_LATINO' | 'BOYS_AND_GIRLS_CLUB' | 'TOUCHSTONE' | 'OTHER' | 'JONAH_GROUP'
  name: string
  description: string | null
  externalLink: string | null
  createdAt: string
  status: EventStatus
}
