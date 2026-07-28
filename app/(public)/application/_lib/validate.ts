import isValidEmail from '@/lib/regex/isValidEmail'
import { ApplicationFormInputs } from '@/app/(public)/application/_types/application.types'

export function validate(inputs: ApplicationFormInputs): Partial<Record<keyof ApplicationFormInputs, string>> {
  const errors: Partial<Record<keyof ApplicationFormInputs, string>> = {}
  if (!inputs.name.trim()) errors.name = 'Please enter a valid name'
  if (!isValidEmail(inputs.email)) errors.email = 'Please enter a valid email'
  if (!inputs.company.trim()) errors.company = 'Please enter a valid company'
  if (!inputs.location.trim()) errors.location = 'Please enter a valid location'
  if (!inputs.industry.trim()) errors.industry = 'Please enter a valid industry'
  if (!inputs.phone.trim() || inputs.phone.replace(/\D/g, '').length < 10)
    errors.phone = 'Please enter a valid 10-digit phone number'
  if (!inputs.businessLicenseNumber.trim())
    errors.businessLicenseNumber = 'Please enter a valid business license number'
  return errors
}
