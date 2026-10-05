export interface IndustrySeat {
  label: string
  aliases?: string[]
}

export const INDUSTRY_SEATS: IndustrySeat[] = [
  { label: 'Property & Casualty Insurance', aliases: ['insurance agent', 'property and casualty'] },
  { label: 'Mortgage', aliases: ['mortgage broker', 'lending', 'loan officer'] },
  { label: 'Residential Real Estate Agent', aliases: ['realtor', 'real estate agent'] },
  { label: 'Commercial Real Estate Agent', aliases: ['realtor', 'real estate agent'] },
  { label: 'Payroll Services', aliases: ['payroll', 'human resources', 'hr'] },
  { label: 'Custom Cabinetry and Millwork', aliases: ['custom cabinetry', 'millwork'] },
  { label: 'Financial Advisor', aliases: ['financial advisor', 'wealth management'] },
  { label: 'Software Development', aliases: ['web design', 'software', 'development'] },
  { label: 'Law', aliases: ['attorney', 'lawyer', 'legal'] },
  { label: 'Accountant', aliases: ['cpa', 'tax prep', 'bookkeeping'] },
  { label: 'Life Insurance', aliases: ['life'] },
  { label: 'Non-Profit Director' },
  { label: 'Loan Officer' },
  { label: 'Real Estate Attorney', aliases: ['title', 'closing', 'escrow'] },
  { label: 'Bank Manager' },
  { label: 'Legal' },
  { label: 'Lawyer' },

  { label: 'Plumbing' },
  { label: 'Electrical' },
  { label: 'HVAC' },
  { label: 'Landscaping' },
  { label: 'Roofing' },
  { label: 'General Contracting' },
  { label: 'Painting' },
  { label: 'Flooring' },
  { label: 'Chiropractic' },
  { label: 'Dentistry' },
  { label: 'Physical Therapy' },
  { label: 'Photography' },
  { label: 'Videography' },
  { label: 'Printing' },
  { label: 'Signage' },
  { label: 'Auto Body' },
  { label: 'Moving' },
  { label: 'Pest Control' },
  { label: 'Commercial Cleaning' },
  { label: 'Travel' },
  { label: 'Catering' },
  { label: 'Fitness' },
  { label: 'Staffing' },
  { label: 'IT Services' }
]

export function normalizeIndustry(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
