'use client'

import dynamic from 'next/dynamic'
import { Member } from '@/types/attendance.types'

// WebGL and the painted canvas textures only exist in the browser
const CheckinVoyage = dynamic(() => import('./CheckinVoyage'), { ssr: false })

export default function CheckinVoyageLoader(props: { members: Member[]; initialAttendees: string[]; todayISO: string }) {
  return <CheckinVoyage {...props} />
}
