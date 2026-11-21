'use client'

import { useEffect, useRef, useState } from 'react'
import { VesselConfig } from '@/lib/vessel/catalog'
import { Member } from '@/types/attendance.types'
import CheckinVoyageLoader from '../checkin-voyage/CheckinVoyageLoader'
import { QrLayer } from './_components/QrLayer'
import { TuningPanel } from './_components/TuningPanel'
import { PRESETS, PresetKey, QrSettings } from './_lib/presets'

// EXPERIMENT: can a camera read a huge, nearly invisible QR code laid over the harbor from a distance? The check-in
// voyage scene as it is (its camera, sea, lighting and geometry), with a flat QR layer over the screen and a panel to
// tune it. Nothing here is used anywhere else.
export default function InvisibleQrClient(props: {
  members: Member[]
  initialAttendees: string[]
  todayISO: string
  vessels: Record<string, VesselConfig>
}) {
  const [preset, setPreset] = useState<PresetKey | null>('control')
  const [s, setS] = useState<QrSettings>(PRESETS.control.settings)
  const [modules, setModules] = useState(0)
  const layer = useRef<HTMLDivElement>(null)

  // the code's size in modules, read from what was drawn
  useEffect(() => {
    const box = layer.current?.querySelector('svg')?.getAttribute('viewBox')
    setModules(Number(box?.split(' ')[2]) || 0)
  }, [])

  return (
    <>
      <CheckinVoyageLoader {...props} />
      <QrLayer ref={layer} s={s} />
      <TuningPanel
        s={s}
        set={(patch) => {
          setS((v) => ({ ...v, ...patch }))
          setPreset(null)
        }}
        preset={preset}
        pick={(k) => {
          setS(PRESETS[k].settings)
          setPreset(k)
        }}
        modules={modules}
      />
    </>
  )
}
