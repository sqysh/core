'use client'

import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo } from 'react'
import { StudioLighting } from '@/app/dev/lighthouse/_components/StudioLighting'
import { EnvironmentAsset } from '@/lib/environment/EnvironmentAsset'
import { previewTerrain } from '@/lib/environment/core/terrain'
import { AssetBuild } from '@/lib/environment/core/types'
import { setGranite } from '@/lib/environment/materials/graniteMaterial'
import { AnchorMarkers } from './AnchorMarkers'
import { CameraLink, CameraRig, CameraView, FollowCamera } from './CameraRig'
import { DioramaGround, dioramaTerrain } from './DioramaGround'
import { PreviewGround, PreviewWater } from './PreviewGround'
import { FrameStats, RenderStats } from './RenderStats'
import { RigAdjust } from './RigAdjust'
import { WorkshopSettings } from './settings'

// The workshop's scene, presented the way the CORE world is: the world's own lighting rig and studio backdrop, its
// coastal tile as a diorama, and the same finish as the lighthouse diorama (ambient occlusion, a touch of bloom, neutral
// tone mapping, vignette). The plain test grounds are there for checking how an asset sits on other terrain. Side by
// side, a second scene follows the first's camera (`camera.follow`) or leads one (`camera.lead`).

const DEG = Math.PI / 180

export function WorkshopScene({
  build,
  settings: s,
  view,
  viewNonce,
  camera,
  onStats
}: {
  build: AssetBuild | null
  settings: WorkshopSettings
  view: CameraView
  /** Bumped to return to the chosen view after orbiting away */
  viewNonce: number
  camera?: { lead?: CameraLink; follow?: CameraLink }
  /** Frame statistics, if this scene reports them */
  onStats?: (stats: FrameStats) => void
}) {
  const terrain = useMemo(
    () => (s.ground === 'diorama' ? dioramaTerrain : previewTerrain(s.ground, s.terrainSeed)),
    [s.ground, s.terrainSeed]
  )
  // the granite's shoreline zones follow the ground's sea, if it has one
  useEffect(() => setGranite({ seaLevel: terrain.seaLevel }), [terrain])

  return (
    <>
      <StudioLighting />
      <RigAdjust settings={s} />

      {s.ground === 'diorama' ? <DioramaGround /> : <PreviewGround terrain={terrain} />}
      {s.ground !== 'diorama' && terrain.seaLevel !== null && <PreviewWater level={terrain.seaLevel} />}
      {build && <EnvironmentAsset build={build} terrain={terrain} yaw={s.yaw * DEG} wireframe={s.wireframe} />}
      {build && s.anchors && <AnchorMarkers terrain={terrain} anchor={build.anchor} yaw={s.yaw * DEG} />}

      {camera?.follow ? (
        <FollowCamera link={camera.follow} />
      ) : (
        <CameraRig view={view} nonce={viewNonce} autoRotate={s.autoRotate} link={camera?.lead} subject={build?.size} />
      )}
      {onStats && <RenderStats onStats={onStats} />}
      {s.finish && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={1.1} distanceFalloff={0.55} intensity={1.8} quality="high" color="#1d1712" halfRes={false} />
          <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.35} />
          <SMAA />
        </EffectComposer>
      )}
    </>
  )
}
