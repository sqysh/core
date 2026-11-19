'use client'

import { useMemo } from 'react'
import { CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry } from 'three'
import { archPath } from '../_lib/geometry'
import { ArchedWindow, OnWall } from './Parts'
import { materials } from '../_lib/materials'
import { TOWER, towerRadius } from '../_lib/lighthouseTile'

// The striped tower: dressed-stone foundation, five painted bands, a corbelled gallery with a railing, the lantern
// room and a copper-rimmed teal dome. Local origin is the centre of its foundation, on the rock.

const LANTERN = { r: 1.08, h: 1.42 }

export function Lighthouse({ position }: { position: [number, number, number] }) {
  const m = materials()

  const bands = useMemo(
    () =>
      TOWER.bands.slice(0, -1).map((y0, i) => {
        const y1 = TOWER.bands[i + 1]
        const g = new CylinderGeometry(towerRadius(y1), towerRadius(y0), y1 - y0, 72, 1, true)
        return { g, y: (y0 + y1) / 2, mat: i % 2 === 0 ? m.teal : m.cream }
      }),
    [m]
  )
  const seams = useMemo(
    () => TOWER.bands.slice(1, -1).map((y) => ({ y, g: new TorusGeometry(towerRadius(y) + 0.005, 0.035, 10, 72) })),
    []
  )

  const doorGeo = useMemo(() => {
    const s = archPath(0.56, 0.86) as Shape
    return new ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 16 })
  }, [])
  const doorFrameGeo = useMemo(() => {
    const s = archPath(0.74, 0.98) as Shape
    return new ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 16 })
  }, [])

  const posts = useMemo(() => Array.from({ length: 30 }, (_, i) => (i / 30) * Math.PI * 2), [])
  const lanternPanes = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + 0.2), [])
  const footWindows = useMemo(() => Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2 + 0.35), [])
  const domeGeo = useMemo(() => new SphereGeometry(1.22, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), [])

  const g0 = TOWER.bands[TOWER.bands.length - 1]
  const gallery = TOWER.gallery

  return (
    <group position={position}>
      {/* foundation: a plinth and a ring of dressed stone with small dark openings */}
      <mesh material={m.stoneDark} position={[0, 0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.86, 1.92, 0.12, 72]} />
      </mesh>
      <mesh material={m.stoneBase} position={[0, (0.12 + TOWER.baseTop) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.72, 1.76, TOWER.baseTop - 0.12, 72]} />
      </mesh>
      <mesh material={m.stone} position={[0, TOWER.baseTop, 0]} castShadow>
        <torusGeometry args={[1.66, 0.06, 10, 72]} />
      </mesh>
      {footWindows.map((a, i) =>
        Math.abs(a - 0.35) < 0.1 ? null : (
          <OnWall key={i} a={a} y={0.32} r={1.72}>
            <mesh material={m.glass}>
              <boxGeometry args={[0.16, 0.24, 0.04]} />
            </mesh>
          </OnWall>
        )
      )}
      <OnWall a={0.35} y={0.1} r={1.7}>
        <mesh geometry={doorFrameGeo} material={m.trim} position={[0, 0, -0.01]} castShadow />
        <mesh geometry={doorGeo} material={m.timber} position={[0, 0, 0.03]} />
      </OnWall>

      {/* painted bands with soft seams between them */}
      {bands.map((b, i) => (
        <mesh key={i} geometry={b.g} material={b.mat} position={[0, b.y, 0]} castShadow receiveShadow />
      ))}
      {seams.map((s, i) => (
        <mesh key={i} geometry={s.g} material={m.stone} position={[0, s.y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      ))}
      {/* a fine pinstripe inside each cream band */}
      {[1, 3].map((i) => {
        const y = TOWER.bands[i + 1] - 0.28
        return (
          <mesh key={i} material={m.teal} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[towerRadius(y) + 0.004, 0.02, 8, 72]} />
          </mesh>
        )
      })}

      {/* windows climbing the tower */}
      {[
        { y: 1.45, a: 0.55 },
        { y: 3.35, a: 0.15 },
        { y: 5.2, a: 0.6 },
        { y: 7.05, a: 0.2 },
        { y: 3.0, a: 1.75 },
        { y: 6.7, a: 1.55 },
        { y: 2.2, a: 3.4 },
        { y: 5.8, a: 3.9 },
        { y: 4.3, a: 5.2 },
        { y: 7.6, a: 2.6 }
      ].map((wdw, i) => (
        <OnWall key={i} a={wdw.a} y={wdw.y} r={towerRadius(wdw.y)}>
          <ArchedWindow w={0.3} h={0.56} />
        </OnWall>
      ))}

      {/* wooden beams that carry the string lights */}
      {[-Math.PI / 4, (3 * Math.PI) / 4].map((a, i) => (
        <OnWall key={i} a={a} y={TOWER.beamY} r={towerRadius(TOWER.beamY) + 0.45}>
          <mesh material={m.timber} castShadow>
            <boxGeometry args={[0.15, 0.15, 1.0]} />
          </mesh>
          <mesh material={m.timber} position={[0, -0.24, -0.32]} rotation={[0.75, 0, 0]} castShadow>
            <boxGeometry args={[0.09, 0.09, 0.62]} />
          </mesh>
          <mesh material={m.copper} position={[0, -0.02, 0.5]}>
            <sphereGeometry args={[0.07, 12, 8]} />
          </mesh>
        </OnWall>
      ))}

      {/* corbelled gallery and its railing */}
      <mesh material={m.stone} position={[0, (g0 + gallery) / 2, 0]} castShadow>
        <cylinderGeometry args={[1.72, TOWER.rTop, gallery - g0, 72]} />
      </mesh>
      <mesh material={m.stone} position={[0, gallery + 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.84, 1.8, 0.18, 72]} />
      </mesh>
      {posts.map((a, i) => (
        <mesh key={i} material={m.stoneDark} position={[Math.sin(a) * 1.74, gallery + 0.45, Math.cos(a) * 1.74]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.55, 6]} />
        </mesh>
      ))}
      <mesh material={m.trim} position={[0, gallery + 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.74, 0.035, 8, 96]} />
      </mesh>
      <mesh material={m.stoneDark} position={[0, gallery + 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.74, 0.016, 6, 96]} />
      </mesh>

      {/* lantern room */}
      <group position={[0, gallery + 0.18, 0]}>
        <mesh material={m.cream} position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[LANTERN.r + 0.06, LANTERN.r + 0.08, 0.32, 64]} />
        </mesh>
        <mesh material={m.cream} position={[0, LANTERN.h / 2 + 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[LANTERN.r, LANTERN.r, LANTERN.h - 0.1, 64]} />
        </mesh>
        {lanternPanes.map((a, i) => (
          <OnWall key={i} a={a} y={0.42} r={LANTERN.r}>
            <ArchedWindow w={0.36} h={0.86} glow />
          </OnWall>
        ))}
        {/* copper rim and cornice under the dome */}
        <mesh material={m.copper} position={[0, LANTERN.h + 0.14, 0]} castShadow>
          <cylinderGeometry args={[1.3, 1.16, 0.16, 64]} />
        </mesh>
        <mesh material={m.copper} position={[0, LANTERN.h + 0.26, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[1.25, 0.15, 16, 72]} />
        </mesh>
        <mesh geometry={domeGeo} material={m.tealDome} position={[0, LANTERN.h + 0.28, 0]} scale={[1, 0.92, 1]} castShadow />
        {/* oculus on top: a cream ring around pale blue glass */}
        <group position={[0, LANTERN.h + 0.28 + 1.22 * 0.92 - 0.06, 0]}>
          <mesh material={m.cream} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.42, 0.075, 12, 48]} />
          </mesh>
          <mesh material={m.lens} position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.05, 40]} />
          </mesh>
        </group>
        {/* the lamp, glowing faintly inside */}
        <pointLight position={[0, 0.8, 0]} intensity={1.2} distance={3.5} color="#ffb366" />
      </group>
    </group>
  )
}
