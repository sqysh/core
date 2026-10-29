export interface BillingOrder {
  id: string
  type: string
  status: string
  amount: number
  createdAt: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  meetingDate: string | null
  hostedInvoiceUrl: string | null
  invoicePdfUrl: string | null
  invoiceNumber: string | null
}

export interface BillingPaymentMethod {
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface BillingPaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export interface BillingClientProps {
  subscriptions: BillingOrder[]
  corrections: BillingOrder[]
  missedMeetings: { meetingId: string; date: string }[]
  paymentMethod: BillingPaymentMethod | null
}
