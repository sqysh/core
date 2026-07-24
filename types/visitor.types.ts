export interface CreateVisitorInput {
  firstName: string
  lastName: string
  email: string
  company?: string
  industry?: string
  phone?: string
  visitDate: string // YYYY-MM-DD
  notes?: string
}

export interface Visitor {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  industry?: string
  createdAt?: string
  visitDate: string
  invitedBy?: { name: string }
}
