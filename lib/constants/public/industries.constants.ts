export interface IndustrySeat {
  label: string
  aliases?: string[]
}

export const INDUSTRY_SEATS: IndustrySeat[] = [
  // Taken — labels match the industry field on active members exactly
  { label: 'Property & Casualty Insurance', aliases: ['insurance', 'p&c', 'property and casualty'] },
  { label: 'Life Insurance', aliases: ['life'] },
  { label: 'Loan Officer', aliases: ['mortgage', 'lending', 'loan'] },
  { label: 'Bank Manager', aliases: ['banking', 'bank'] },
  { label: 'Financial Advisor', aliases: ['wealth management', 'financial planning'] },
  { label: 'Accountant', aliases: ['accounting', 'cpa', 'tax prep', 'bookkeeping'] },
  { label: 'Lawyer', aliases: ['attorney', 'law'] },
  { label: 'Legal', aliases: ['legal services'] },
  { label: 'Real Estate Attorney', aliases: ['title', 'closing', 'escrow', 'conveyancing'] },
  { label: 'Residential Real Estate Agent', aliases: ['realtor', 'residential real estate'] },
  { label: 'Commercial Real Estate Agent', aliases: ['commercial real estate'] },
  { label: 'Payroll Services', aliases: ['payroll', 'human resources', 'hr'] },
  { label: 'Custom Cabinetry and Millwork', aliases: ['cabinetry', 'millwork', 'carpentry'] },
  { label: 'Software Development', aliases: ['web design', 'web development', 'software', 'app development'] },
  { label: 'Non-Profit Director', aliases: ['nonprofit', 'non profit'] },

  // Open — industries we're actively looking for
  { label: 'Contractor', aliases: ['general contracting', 'builder', 'remodeling'] },
  { label: 'Plumber', aliases: ['plumbing'] },
  { label: 'Electrician', aliases: ['electrical'] },
  { label: 'HVAC', aliases: ['heating', 'cooling', 'air conditioning'] },
  { label: 'Painter', aliases: ['painting'] },
  { label: 'Handyman', aliases: ['handy man', 'home repair'] },
  { label: 'Landscaper', aliases: ['landscaping', 'lawn care'] },
  { label: 'Junk Removal', aliases: ['hauling', 'dumpster'] },
  { label: 'Movers', aliases: ['moving', 'moving company'] },
  { label: 'Cleaning Business', aliases: ['cleaning', 'janitorial', 'housekeeping', 'commercial cleaning'] },
  { label: 'Body Shop', aliases: ['auto body', 'collision', 'auto repair'] },
  { label: 'Pet Groomer', aliases: ['grooming', 'pet grooming', 'dog groomer'] },
  { label: 'Spa', aliases: ['salon', 'massage', 'esthetician'] },
  { label: 'Therapist', aliases: ['therapy', 'counseling', 'mental health', 'counselor'] },
  { label: 'IT Services', aliases: ['it owner', 'managed it', 'tech support', 'cybersecurity'] },
  { label: 'Personal Injury Attorney', aliases: ['personal injury', 'injury lawyer'] },
  { label: 'Immigration Attorney', aliases: ['immigration', 'immigration lawyer'] },
  { label: 'Estate Planning', aliases: ['estate attorney', 'wills', 'trusts', 'probate'] },
  { label: 'Commercial Lender', aliases: ['commercial lending', 'business lending', 'sba'] },
  { label: 'Small Business Owner', aliases: ['small business', 'entrepreneur'] }
]

export function normalizeIndustry(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
