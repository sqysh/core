export type ReferralRecord = {
  id: string
  clientName: string
  clientPhone: string
  serviceNeeded: string
  notes: string | null
  status: string
  createdAt: string
  giver: { name: string; company: string }
  receiver: { name: string; company: string }
}

export type F2FRecord = {
  id: string
  scheduledAt: string
  notes: string | null
  status: string
  createdAt: string
  requester: { name: string; company: string }
  recipient: { name: string; company: string }
}

export type ClosedRecord = {
  id: string
  businessValue: number
  description: string
  closedDate: string
  notes: string | null
  status: string
  createdAt: string
  giver: { name: string; company: string } | null
  receiver: { name: string; company: string } | null
}
