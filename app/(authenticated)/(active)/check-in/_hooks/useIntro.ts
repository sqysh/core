import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { TOUR_AT } from '../_lib/script'
import type { Spot, SqyshMode, TourState } from '../_lib/types'

interface Options {
  hasTour: boolean
  settle: number
  setSpot: Dispatch<SetStateAction<Spot>>
  setMode: Dispatch<SetStateAction<SqyshMode>>
  jumpToCorner: () => boolean
}

// Sqysh drops in to the ring, parks on its edge, and (when there's news) hops to
// the corner and offers the changelog.
export function useIntro({ hasTour, settle, setSpot, setMode, jumpToCorner }: Options) {
  const [tour, setTour] = useState<TourState>('hidden')

  useEffect(() => {
    const ids = [setTimeout(() => setSpot('centre'), 150), setTimeout(() => setSpot('park'), (settle + 0.1) * 1000)]
    if (hasTour) {
      ids.push(
        setTimeout(jumpToCorner, (settle + TOUR_AT) * 1000),
        setTimeout(() => setMode('wave'), (settle + TOUR_AT + 0.9) * 1000),
        setTimeout(() => setMode('idle'), (settle + TOUR_AT + 2.6) * 1000),
        setTimeout(() => setTour('ask'), (settle + TOUR_AT + 0.6) * 1000)
      )
    }
    return () => ids.forEach(clearTimeout)
  }, [hasTour, settle, setSpot, setMode, jumpToCorner])

  return [tour, setTour] as const
}
