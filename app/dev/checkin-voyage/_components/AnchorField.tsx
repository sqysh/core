'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, BufferGeometry, CylinderGeometry, InstancedMesh, Object3D, Quaternion, TorusGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HarborStore } from '../_lib/store'
import { hullToWorld } from '../_lib/vessel/anchor'
import { VESSEL_CLASS_SPECS } from '../_lib/vessel/classes'
import { submerged, SUBMERGED_ORDER } from '../_lib/vessel/submerged'
import { seaAt } from '../_lib/waves'
import { kit } from './boats/kit'

// Every boat's anchor and rode, in two instanced draws however big the fleet. The anchor stows in its bow roller
// (moving with the hull), hangs from its rode as it goes down or comes up, and lies on the seabed with its shank toward
// the boat once it bites; the rode runs from the roller to the water and on down to the anchor's shackle.

const MAX = 64
const up = new Vector3(0, 1, 0)

/** A plough anchor, unit size, crown at the origin and shank up +y to the shackle; flukes spread across x */
function anchorGeometry() {
  const parts: BufferGeometry[] = []
  const shank = new CylinderGeometry(0.035, 0.045, 0.9, 8)
  shank.translate(0, 0.5, 0)
  parts.push(shank)
  const ring = new TorusGeometry(0.07, 0.022, 6, 12)
  ring.translate(0, 0.98, 0)
  parts.push(ring)
  // a stock across the crown and two broad flukes angled down from it
  const stock = new CylinderGeometry(0.03, 0.03, 0.62, 8)
  stock.rotateZ(Math.PI / 2)
  stock.translate(0, 0.06, 0)
  parts.push(stock)
  for (const side of [-1, 1]) {
    const fluke = new BoxGeometry(0.26, 0.42, 0.04)
    fluke.translate(0, 0.16, 0)
    fluke.rotateZ(side * 0.55)
    fluke.rotateY(side * 0.25)
    fluke.translate(side * 0.16, 0.02, 0)
    parts.push(fluke)
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => (g.deleteAttribute('uv'), g)))!
}

export function AnchorField({ store }: { store: HarborStore }) {
  const anchors = useRef<InstancedMesh>(null)
  const rodes = useRef<InstancedMesh>(null)
  const wetAnchors = useRef<InstancedMesh>(null)
  const wetRodes = useRef<InstancedMesh>(null)
  const anchorGeo = useMemo(anchorGeometry, [])
  const rodeGeo = useMemo(() => {
    const g = new CylinderGeometry(1, 1, 1, 5, 1, true)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  const k = kit()
  const tmp = useMemo(
    () => ({
      o: new Object3D(),
      roller: new Vector3(),
      shackle: new Vector3(),
      water: new Vector3(),
      hull: new Quaternion(),
      q: new Quaternion(),
      hang: new Quaternion(),
      dir: new Vector3()
    }),
    []
  )

  useFrame(({ clock }) => {
    const am = anchors.current
    const rm = rodes.current
    if (!am || !rm) return
    const t = clock.elapsedTime
    let na = 0
    let nr = 0
    const segment = (a: Vector3, b: Vector3, r: number) => {
      tmp.dir.subVectors(b, a)
      const len = tmp.dir.length()
      if (len < 1e-3 || nr >= MAX * 2) return
      tmp.o.position.copy(a)
      tmp.o.quaternion.setFromUnitVectors(up, tmp.dir.multiplyScalar(1 / len))
      tmp.o.scale.set(r, len, r)
      tmp.o.updateMatrix()
      rm.setMatrixAt(nr++, tmp.o.matrix)
    }

    for (const b of store.boats.values()) {
      if (b.phase === 'waiting' || na >= MAX) continue
      const spec = b.who.spec
      const a = b.anchor
      const size = spec.anchor
      hullToWorld(b, spec.mounts.roller, tmp.roller, tmp.hull)

      if (a.stage === 'stowed') {
        // seated in the roller: shank running aft and a little up along the foredeck, flukes over the stem
        tmp.o.position.copy(tmp.roller).add(tmp.dir.set(0.045, -0.035, 0).applyQuaternion(tmp.hull))
        tmp.q.setFromUnitVectors(up, tmp.dir.set(-1, 0.28, 0).normalize())
        tmp.o.quaternion.copy(tmp.hull).multiply(tmp.q)
      } else {
        tmp.o.position.set(a.x, a.y, a.z)
        if (a.stage === 'holding' || (a.stage === 'weighing' && !a.lifting)) {
          // lying on the bottom, flukes dug in, shank toward the boat
          tmp.dir.set(tmp.roller.x - a.x, 0, tmp.roller.z - a.z)
          if (tmp.dir.lengthSq() < 1e-6) tmp.dir.set(-Math.sin(b.heading), 0, -Math.cos(b.heading))
          tmp.dir.normalize()
          tmp.dir.y = 0.22
          tmp.o.quaternion.setFromUnitVectors(up, tmp.dir.normalize())
          tmp.o.position.y -= size * 0.12
        } else {
          // hanging from the rode, swinging a little as it goes
          tmp.hang.setFromAxisAngle(tmp.dir.set(Math.cos(b.heading), 0, -Math.sin(b.heading)), Math.sin(t * 3.1 + b.berth.x) * 0.12)
          tmp.o.quaternion.copy(tmp.hang)
        }
      }
      tmp.o.scale.setScalar(size)
      tmp.o.updateMatrix()
      am.setMatrixAt(na++, tmp.o.matrix)
      if (a.stage === 'stowed') continue

      // the rode: shackle (top of the shank) to the roller, via the water's surface when it leads away at an angle
      tmp.shackle.set(0, 0.98 * size, 0).applyQuaternion(tmp.o.quaternion).add(tmp.o.position)
      const r = 0.006 + size * 0.03
      const away = Math.hypot(tmp.roller.x - tmp.shackle.x, tmp.roller.z - tmp.shackle.z)
      if (away < 0.12) segment(tmp.shackle, tmp.roller, r)
      else {
        // from the roller it drops steeply to the water a short way ahead, then runs on down to the anchor
        const f = Math.min(0.3, 0.25 / away)
        const wx = tmp.roller.x + (tmp.shackle.x - tmp.roller.x) * f
        const wz = tmp.roller.z + (tmp.shackle.z - tmp.roller.z) * f
        tmp.water.set(wx, seaAt(wx, wz, t).h - 0.01, wz)
        segment(tmp.roller, tmp.water, r)
        segment(tmp.water, tmp.shackle, r)
      }
    }
    am.count = na
    rm.count = nr
    am.instanceMatrix.needsUpdate = true
    rm.instanceMatrix.needsUpdate = true
    // the same anchors and rodes again over the water, so they show down through it
    for (const [src, dst] of [
      [am, wetAnchors.current],
      [rm, wetRodes.current]
    ] as const) {
      if (!dst) continue
      dst.instanceMatrix.array.set(src.instanceMatrix.array.subarray(0, src.count * 16))
      dst.count = src.count
      dst.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={anchors} args={[anchorGeo, k.galvanised, MAX]} frustumCulled={false} castShadow />
      <instancedMesh ref={rodes} args={[rodeGeo, k.chain, MAX * 2]} frustumCulled={false} />
      <instancedMesh ref={wetAnchors} args={[anchorGeo, submerged(k.galvanised), MAX]} frustumCulled={false} renderOrder={SUBMERGED_ORDER} />
      <instancedMesh ref={wetRodes} args={[rodeGeo, submerged(k.chain), MAX * 2]} frustumCulled={false} renderOrder={SUBMERGED_ORDER} />
    </>
  )
}
