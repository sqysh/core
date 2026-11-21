'use client'

import dynamic from 'next/dynamic'
import { LocateFixed } from 'lucide-react'
import { GlassButton, glassButton, glassPanel } from '@/components/_shared/LiquidGlass'
import { STAGES } from '@/lib/vessel/catalog'
import { lookOf } from '@/app/dev/checkin-voyage/_lib/vessel/look'
import { useGarageContext } from '../_hooks/GarageContext'
import { BoatSketch } from './BoatSketch'
import { GarageLoading } from './GarageLoading'

// the 3D preview's code (three, the boat models, the sea shader) only loads here, never in the page's first load
const BoatPreview = dynamic(() => import('@/app/dev/checkin-voyage/BoatPreview'), { ssr: false, loading: () => null })

/** The sea and the boat (or the next level, previewed on her), the whole screen, and the controls that sit on it */
export function GarageScene() {
  const {
    shown,
    frame,
    home,
    setHome,
    firstName,
    previewFailed,
    setPreviewFailed,
    setSceneReady,
    updateLoad,
    previewing,
    setPreviewing,
    landscape
  } = useGarageContext()
  return (
    <>
      {previewFailed ? (
        <div
          className="absolute"
          style={{
            left: `${(frame.x - frame.width / 2) * 100}%`,
            top: `${(frame.y - frame.height / 2) * 100}%`,
            width: `${frame.width * 100}%`,
            height: `${frame.height * 100}%`
          }}
        >
          <BoatSketch kind={shown.vesselClass} look={lookOf(shown)} />
        </div>
      ) : (
        <BoatPreview
          config={shown}
          frame={frame}
          home={home}
          name={firstName}
          onLoad={updateLoad}
          onReady={() => setSceneReady(true)}
          onUnsupported={() => setPreviewFailed(true)}
        />
      )}

      {previewing && (
        <div
          className={`pointer-events-none absolute flex justify-center ${
            landscape
              ? 'bottom-[max(14px,env(safe-area-inset-bottom))] left-0 w-[56%]'
              : 'inset-x-0 top-[calc(max(12px,env(safe-area-inset-top))+56px)]'
          }`}
        >
          <div className={`${glassPanel} pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5`}>
            <span className="font-sora text-[12px] font-bold">
              Previewing: {STAGES[previewing].name} · Level {STAGES[previewing].level}
            </span>
            <GlassButton onClick={() => setPreviewing(null)} className="h-8 rounded-full px-3 text-[11px]">
              Back to my boat
            </GlassButton>
          </div>
        </div>
      )}

      {/* ── turn her back to the default three-quarter view ── */}
      {!previewFailed && (
        <button
          type="button"
          onClick={() => setHome((h) => h + 1)}
          aria-label="Reset the view"
          className={`${glassButton()} absolute h-11 w-11 rounded-full ${
            landscape
              ? 'bottom-[max(64px,calc(env(safe-area-inset-bottom)+12px))] left-[max(12px,env(safe-area-inset-left))]'
              : 'right-[max(12px,env(safe-area-inset-right))] top-[calc(max(12px,env(safe-area-inset-top))+56px)]'
          }`}
        >
          <LocateFixed size={18} aria-hidden="true" />
        </button>
      )}
      <GarageLoading />
    </>
  )
}
