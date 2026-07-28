import { useEffect, useState } from 'react'

export function NextMeetingCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function getNextThursday() {
      const now = new Date()
      const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const day = est.getDay()
      const daysUntil = day <= 4 ? 4 - day : 7 - day + 4
      const next = new Date(est)
      next.setDate(est.getDate() + (daysUntil === 0 && est.getHours() >= 8 ? 7 : daysUntil))
      next.setHours(7, 0, 0, 0)
      return next
    }

    function update() {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const next = getNextThursday()
      const diff = next.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Meeting is now!')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m ${seconds}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p className={`text-xs lg:text-sm font-mono tracking-[0.15em] uppercase text-primary-dark hidden sm:block`}>
      Next meeting in <span className="font-bold">{timeLeft}</span>
    </p>
  )
}
