export function fmtCurrency(val: string) {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export function formatAmountInput(value: string) {
  const digits = value.replace(/[^0-9.]/g, '')
  const parts = digits.split('.')
  const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.length > 1 ? `${whole}.${parts[1].slice(0, 2)}` : whole
}
