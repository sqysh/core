export function validateUserData(data: any) {
  const errors: { field: string; message: string }[] = []

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' })
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name too long' })
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' })
  } else if (!/\S+@\S+\.\S+/.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  } else if (data.email.length > 255) {
    errors.push({ field: 'email', message: 'Email too long' })
  }

  if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
    errors.push({ field: 'company', message: 'Company is required' })
  } else if (data.company.length > 100) {
    errors.push({ field: 'company', message: 'Company name too long' })
  }

  if (!data.industry || typeof data.industry !== 'string' || data.industry.trim().length === 0) {
    errors.push({ field: 'industry', message: 'Industry is required' })
  } else if (data.industry.length > 100) {
    errors.push({ field: 'industry', message: 'Industry too long' })
  }

  return errors
}
