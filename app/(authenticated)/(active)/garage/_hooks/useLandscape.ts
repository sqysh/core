import { useEffect, useState } from 'react'

export function useLandscape() {
  const [landscape, setLandscape] = useState(true)
  useEffect(() => {
    const q = window.matchMedia('(orientation: landscape)')
    const update = () => setLandscape(q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  return landscape
}
