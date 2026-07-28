export interface ApplicationFormInputs {
  name: string
  email: string
  company: string
  industry: string
  location: string
  phone: string
  businessLicenseNumber: string
}

export interface ApplicationConfirmationProps {
  application: {
    name: string
    email: string
    phone?: string | null
    location?: string | null
    company: string
    industry: string
    businessLicenseNumber?: string | null
    isLicensed?: boolean
  }
}
