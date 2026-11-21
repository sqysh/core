/**
 * Morning, afternoon or evening on the chapter's clock (Eastern). Not the device's: the server renders it in UTC, so a
 * local hour gave the server and the member's phone different greetings (a hydration mismatch every morning).
 */
export function getGreeting(): string {
  const h = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(
      new Date()
    )
  )
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
