'use client'

import { useEffect, useMemo, useState } from 'react'
import { FrameStats, RenderStats } from '@/app/dev/environment-kit/_components/RenderStats'
import { StudioLighting } from '@/app/dev/lighthouse/_components/StudioLighting'
import { comparePieces, exhibitCentre, ExhibitId, MergeReport } from '../_lib/compare'
import { bakeSea } from '../_lib/ground'
import { LoadedModel } from '../_lib/models'
import { BuilderSettings, Camera, Finish, wire } from './HarborScene'
import { Sea, SeaBake } from './Sea'

// The terrain comparison's scene: the same lighting and animated sea as the builder, with the three exhibits (original
// pair, cleaned pair, sculpted formation) side by side, left to right, the sea's shallows baked from all three.

export function CompareScene({
  report,
  loaded,
  shown,
  settings,
  focus,
  viewNonce,
  turn,
  onStats
}: {
  report: MergeReport | null
  loaded: Record<string, LoadedModel | undefined>
  shown: Record<ExhibitId, boolean>
  settings: BuilderSettings
  /** The exhibit the camera is set on, or null for all three */
  focus: ExhibitId | null
  viewNonce: number
  turn: number
  onStats: (s: FrameStats) => void
}) {
  const pieces = useMemo(() => comparePieces(report, loaded), [report, loaded])
  const visible = pieces.filter((p) => shown[p.exhibit])

  const key = visible.map((p) => p.key).join(',')
  const [bake, setBake] = useState<SeaBake | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setBake(bakeSea(visible)), 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const [cx, cz] = exhibitCentre(focus ?? 'cleaned')

  return (
    <>
      <color attach="background" args={['#2a7fb0']} />
      <StudioLighting
        focus={[cx, 0, cz]}
        shadowRange={focus ? 16 : 42}
        shadowSoftness={focus ? 3 : 4}
        backdrop={false}
      />
      <Sea bake={bake} />
      {visible.map(({ key, model, transform: t }) => (
        <group key={key} position={t.position} scale={t.scale}>
          <mesh geometry={model.geometry} material={model.material} castShadow={settings.shadows} receiveShadow />
          {settings.wireframe && <mesh geometry={model.geometry} material={wire} />}
        </group>
      ))}
      <Camera nonce={viewNonce} turn={turn} target={[cx, cz]} width={focus ? 30 : 86} />
      <RenderStats onStats={onStats} />
      {settings.finish && <Finish />}
    </>
  )
}
