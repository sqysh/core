export function pct(votes: number, total: number) {
  return total === 0 ? 0 : Math.round((votes / total) * 100)
}
