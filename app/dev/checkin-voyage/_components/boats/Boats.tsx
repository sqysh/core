'use client'

import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Material,
  Shape,
  TorusGeometry,
  Vector2
} from 'three'
import { Finish, VesselClassId } from '@/lib/vessel/catalog'
import { HullPaint, HullSpec, hullDeck, hullPaintTexture, hullStations, loftedHull } from '../../_lib/hull'
import { Rig } from '../../_lib/store'
import { SLOOP_MAST, VESSEL_CLASS_SPECS } from '../../_lib/vessel/classes'
import { VesselLook } from '../../_lib/vessel/look'
import { submerged, SUBMERGED_ORDER } from '../../_lib/vessel/submerged'
import { Accessories } from './accessories'
import { Modular } from './Modular'
import {
  BowRoller,
  Cleat,
  Crew,
  enamel,
  Fender,
  hullEnamel,
  kit,
  LifeRing,
  Porthole,
  Propeller,
  Rail,
  Rod,
  Wet
} from './kit'

// The modular boat members build (Modular.tsx), and three hand-built heritage boats on the lofted hull — a chrome-trimmed runabout, a Maine lobster boat and a
// bermuda-rigged sloop — complete below the waterline (keels, skegs, rudders and propellers show through the clear
// shallows). Geometry is the class's own (vessel/classes.ts); every colour, the sail pattern and the accessories come
// from the member's look, so customising a boat never touches its model. Bow points along +x, waterline near y = 0.
// `rig` is the boat's live state from the harbor: sails come down and fenders go out at anchor, the propeller turns
// with the way it's making.

/** A thin plate (keel, skeg, rudder) from a side profile of [x, y] points, centred on the hull's centreline */
export function fin(profile: [number, number][], thickness: number) {
  const shape = new Shape(profile.map(([x, y]) => new Vector2(x, y)))
  const g = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: thickness * 0.35,
    bevelThickness: thickness * 0.35,
    bevelSegments: 2
  })
  g.translate(0, 0, -thickness / 2)
  return g
}

/** Sheer height and half-beam at a point along the hull, for seating fittings on the rail */
function useStations(spec: HullSpec) {
  return useMemo(() => {
    const st = hullStations(spec)
    const at = (x: number) => {
      const s = Math.min(1, Math.max(0, x / spec.length + 0.5))
      return { y: st.sheer(s), hb: st.halfBeam(s) }
    }
    return at
  }, [spec])
}

export function Hull({
  spec,
  paint,
  finish,
  rubRail,
  deck
}: {
  spec: HullSpec
  paint: HullPaint
  finish: Finish
  /** The rubbing strake along the sheer; null for a hull without one */
  rubRail: Material | null
  deck: { material: Material; from?: number; to?: number }[]
}) {
  const parts = useMemo(() => {
    const h = loftedHull(spec)
    const map = hullPaintTexture(paint, h.yMin, h.yMax, spec.waterline)
    const rails = ([1, -1] as const).map((side) =>
      h.sheerLine(side).map((p) => [p.x, p.y - 0.012, p.z * 1.02] as [number, number, number])
    )
    return {
      geo: h.geo,
      mat: hullEnamel(map, finish),
      rails,
      decks: deck.map((d) => hullDeck(spec, 0.03, 0.028, d.from, d.to))
    }
    // deck materials don't change the geometry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, paint, finish])
  return (
    <group>
      <mesh geometry={parts.geo} material={parts.mat} castShadow receiveShadow />
      <mesh geometry={parts.geo} material={submerged(parts.mat)} renderOrder={SUBMERGED_ORDER} />
      {rubRail &&
        parts.rails.map((pts, i) => (
          <Rail key={i} points={pts.filter((_, k) => k % 2 === 0)} r={0.016} material={rubRail} />
        ))}
      {parts.decks.map((g, i) => (
        <mesh key={i} geometry={g} material={deck[i].material} receiveShadow castShadow={i > 0} />
      ))}
    </group>
  )
}

/** Red and green sidelights on the bow */
export function NavLights({ x, y, z }: { x: number; y: number; z: number }) {
  const k = kit()
  return (
    <>
      <mesh material={k.navLightRed} position={[x, y, z]}>
        <boxGeometry args={[0.03, 0.02, 0.012]} />
      </mesh>
      <mesh material={k.navLightGreen} position={[x, y, -z]}>
        <boxGeometry args={[0.03, 0.02, 0.012]} />
      </mesh>
    </>
  )
}

/** Fenders that only go over the side once the boat is tied up */
export function Fenders({ rig, spots }: { rig: Rig; spots: [number, number, number][] }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.visible = rig.moored
  })
  return (
    <group ref={ref} visible={rig.moored}>
      {spots.map((p, i) => (
        <Fender key={i} at={p} />
      ))}
    </group>
  )
}

// ─── Runabout ───────────────────────────────────────────────────────────────────

const RUNABOUT: HullSpec = VESSEL_CLASS_SPECS.runabout.hull

function Runabout({ p, rig, showroom }: { p: VesselLook; rig: Rig; showroom?: boolean }) {
  // painted in the member's finish; fittings take their equipment colour when they've chosen one
  const painted = (hex: string) => enamel(hex, p.finish)
  const metal = (original: Material) => (p.equipment ? enamel(p.equipment, p.finish) : original)
  const deckMat = p.deck ? enamel(p.deck, p.finish) : null
  const k = kit()
  const at = useStations(RUNABOUT)
  const paint = useMemo<HullPaint>(
    () => ({ topsides: p.hull, stripe: p.accent, bottom: p.bottom, sheerLine: p.trim }),
    [p]
  )
  const fore = painted(p.hull === '#fbf6ec' ? p.trim : p.hull)
  const cushion = k.cushion(p.seats)
  const piping = k.cushion(p.accent)
  const shield = useMemo(() => new CylinderGeometry(0.36, 0.38, 0.15, 28, 1, true, Math.PI / 2 - 1.05, 2.1), [])
  const shieldFrame = useMemo(() => new TorusGeometry(0.36, 0.008, 6, 28, 2.1), [])
  const bow = at(0.62)
  const tip = at(0.9)
  const lower = useMemo(
    () => ({
      leg: new BoxGeometry(0.07, 0.4, 0.035),
      gearcase: new CapsuleGeometry(0.024, 0.1, 4, 10),
      skeg: new BoxGeometry(0.06, 0.05, 0.008)
    }),
    []
  )
  return (
    <group>
      <Hull
        finish={p.finish}
        spec={RUNABOUT}
        paint={paint}
        rubRail={metal(k.chrome)}
        deck={[
          { material: deckMat ?? k.teak, from: 0, to: 0.6 },
          { material: fore, from: 0.58, to: 0.985 }
        ]}
      />
      {/* windshield: tinted, wrapping round the cockpit, chrome-capped */}
      <group position={[0.02, 0.17, 0]}>
        <mesh geometry={shield} material={k.tint} position={[-0.3, 0.07, 0]} rotation={[0, 0, -0.22]} />
        <group position={[-0.3, 0.155, 0]} rotation={[0, -1.05, 0]}>
          <mesh geometry={shieldFrame} material={metal(k.chrome)} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      </group>
      {/* dash, wheel and throttle */}
      <RoundedBox
        args={[0.12, 0.1, 0.56]}
        radius={0.03}
        smoothness={3}
        material={fore}
        position={[0.0, 0.14, 0]}
        castShadow
      />
      <mesh material={k.rubber} position={[-0.06, 0.21, -0.13]} rotation={[0, Math.PI / 2, -0.5]}>
        <torusGeometry args={[0.045, 0.008, 8, 20]} />
      </mesh>
      <mesh material={metal(k.chrome)} position={[-0.04, 0.2, 0.1]} rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 6]} />
      </mesh>
      {/* bucket seats and the stern bench, piped in the accent colour */}
      {[0.13, -0.13].map((z) => (
        <group key={z} position={[-0.24, 0.1, z]}>
          <RoundedBox args={[0.18, 0.06, 0.2]} radius={0.025} smoothness={3} material={cushion} castShadow />
          <RoundedBox
            args={[0.05, 0.16, 0.2]}
            radius={0.022}
            smoothness={3}
            material={cushion}
            position={[-0.09, 0.09, 0]}
            rotation={[0, 0, 0.18]}
            castShadow
          />
          <mesh material={piping} position={[-0.11, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
          </mesh>
        </group>
      ))}
      <RoundedBox
        args={[0.22, 0.07, 0.6]}
        radius={0.03}
        smoothness={3}
        material={cushion}
        position={[-0.62, 0.09, 0]}
        castShadow
      />
      <RoundedBox
        args={[0.06, 0.15, 0.6]}
        radius={0.025}
        smoothness={3}
        material={cushion}
        position={[-0.74, 0.17, 0]}
        rotation={[0, 0, 0.15]}
        castShadow
      />
      {/* chrome bow rail on little stanchions */}
      {([1, -1] as const).map((side) => (
        <group key={side}>
          <Rail
            points={[
              [0.3, at(0.3).y + 0.06, side * (at(0.3).hb - 0.04)],
              [0.55, at(0.55).y + 0.06, side * (at(0.55).hb - 0.04)],
              [0.8, at(0.8).y + 0.06, side * Math.max(at(0.8).hb - 0.04, 0.02)],
              [0.9, tip.y + 0.06, 0]
            ]}
            r={0.006}
            material={metal(k.chrome)}
          />
          {[0.3, 0.6].map((x) => (
            <Rod
              key={x}
              a={[x, at(x).y, side * (at(x).hb - 0.04)]}
              b={[x, at(x).y + 0.06, side * (at(x).hb - 0.04)]}
              r={0.005}
              material={metal(k.chrome)}
            />
          ))}
        </group>
      ))}
      <NavLights x={0.62} y={bow.y + 0.01} z={bow.hb - 0.02} />
      {/* outboard: a glossy cowling with a stripe, the leg down past the hull's bottom, a cavitation plate, the
          gearcase with its skeg, and the propeller */}
      <group position={[-1.0, 0.12, 0]}>
        <RoundedBox
          args={[0.18, 0.22, 0.15]}
          radius={0.05}
          smoothness={4}
          material={painted(p.equipment ?? '#2a2f36')}
          castShadow
        />
        <mesh material={painted(p.accent)} position={[0.005, 0.03, 0]}>
          <boxGeometry args={[0.185, 0.025, 0.155]} />
        </mesh>
        <Wet geometry={lower.leg} material={painted(p.equipment ?? '#2a2f36')} position={[0.01, -0.28, 0]} />
        <mesh material={metal(k.steel)} position={[0.025, -0.41, 0]}>
          <boxGeometry args={[0.13, 0.008, 0.08]} />
        </mesh>
        <Wet
          geometry={lower.gearcase}
          material={painted(p.equipment ?? '#2a2f36')}
          position={[0.01, -0.47, 0]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <Wet geometry={lower.skeg} material={painted(p.equipment ?? '#2a2f36')} position={[0.0, -0.51, 0]} />
        <Propeller at={[-0.06, -0.47, 0]} r={0.05} spin={rig} />
      </group>
      {/* mooring cleats on the foredeck and either quarter */}
      <Cleat at={[0.72, at(0.72).y - 0.005, 0]} />
      {([1, -1] as const).map((side) => (
        <Cleat key={side} at={[-0.82, at(-0.82).y - 0.012, side * (at(-0.82).hb - 0.07)]} size={0.85} />
      ))}
      {/* in the Garage the boat is shown on her own */}
      {!showroom && (
        <Crew
          at={[-0.22, 0.06, -0.13]}
          turn={0}
          coat={p.trim === '#fbf6ec' ? '#2c5aa0' : p.trim}
          hat="cap"
          hatColor={p.accent}
          pose="helm"
        />
      )}
      <Fenders
        rig={rig}
        spots={[
          [0.1, 0.1, at(0.1).hb + 0.035],
          [-0.5, 0.1, at(-0.5).hb + 0.035]
        ]}
      />
    </group>
  )
}

// ─── Lobster boat ───────────────────────────────────────────────────────────────

const LOBSTER: HullSpec = VESSEL_CLASS_SPECS.lobster.hull

/** A wire lobster trap with wooden runners */
export function Trap({ at, turn = 0 }: { at: [number, number, number]; turn?: number }) {
  const k = kit()
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <RoundedBox args={[0.24, 0.13, 0.16]} radius={0.012} smoothness={2} material={enamel('#6d8a4a')} castShadow />
      {[-0.06, 0.06].map((z) => (
        <mesh key={z} material={k.varnish} position={[0, -0.06, z]}>
          <boxGeometry args={[0.25, 0.015, 0.02]} />
        </mesh>
      ))}
      {[-0.08, 0, 0.08].map((x) => (
        <mesh key={x} material={enamel('#c9b46a')} position={[x, 0, 0]}>
          <boxGeometry args={[0.006, 0.135, 0.165]} />
        </mesh>
      ))}
    </group>
  )
}

/** A painted lobster buoy, banded in the member's colours */
export function Buoy({ at, a, b }: { at: [number, number, number]; a: string; b: string }) {
  return (
    <group position={at}>
      <mesh material={enamel(a)} castShadow>
        <capsuleGeometry args={[0.032, 0.05, 6, 10]} />
      </mesh>
      <mesh material={enamel(b)}>
        <cylinderGeometry args={[0.0335, 0.0335, 0.022, 12]} />
      </mesh>
      <mesh material={kit().varnish} position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.06, 5]} />
      </mesh>
    </group>
  )
}

function Lobster({ p, rig, showroom }: { p: VesselLook; rig: Rig; showroom?: boolean }) {
  // painted in the member's finish; fittings take their equipment colour when they've chosen one
  const painted = (hex: string) => enamel(hex, p.finish)
  const metal = (original: Material) => (p.equipment ? enamel(p.equipment, p.finish) : original)
  const deckMat = p.deck ? enamel(p.deck, p.finish) : null
  const k = kit()
  const at = useStations(LOBSTER)
  const paint = useMemo<HullPaint>(
    () => ({ topsides: p.hull, stripe: p.trim, bottom: p.bottom, sheerLine: p.trim }),
    [p]
  )
  const deckPaint = painted(p.deck ?? '#cfc8b6')
  const cabin = painted(p.cabin)
  const roof = painted(p.roof)
  const house = { x: 0.32, w: 0.62, d: 0.68, h: 0.52 }
  const deckY = at(house.x).y - 0.02
  const bottom = painted(p.bottom)
  const appendages = useMemo(() => {
    const st = hullStations(LOBSTER)
    // the keel's top follows the hull's bottom (a little inside it) from the aperture forward to the forefoot
    const hullBottom = (x: number) => -st.keel(Math.min(1, Math.max(0, x / LOBSTER.length + 0.5))) + 0.03
    const top = Array.from({ length: 9 }, (_, i) => -0.95 + (i / 8) * 1.9).map(
      (x) => [x, hullBottom(x)] as [number, number]
    )
    return {
      keel: fin([...top, [0.95, hullBottom(0.95) - 0.02], [0.2, -0.58], [-0.95, -0.58]], 0.06),
      rudder: fin(
        [
          [-1.12, -0.39],
          [-1.22, -0.39],
          [-1.22, -0.555],
          [-1.12, -0.555]
        ],
        0.03
      ),
      shoe: new BoxGeometry(0.24, 0.022, 0.04)
    }
  }, [])
  const riding = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0, 0.62, 0, -0.34, 0.04, 0]), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array([1, 0, 1, 1, 0, 0.06]), 2))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <group>
      <Hull finish={p.finish} spec={LOBSTER} paint={paint} rubRail={painted(p.trim)} deck={[{ material: deckPaint }]} />
      {/* wheelhouse: raked front windows, side lights, an overhanging roof with its kit on top */}
      <group position={[house.x, deckY, 0]}>
        <RoundedBox
          args={[house.w, house.h, house.d]}
          radius={0.035}
          smoothness={3}
          material={cabin}
          position={[0, house.h / 2, 0]}
          castShadow
          receiveShadow
        />
        {[-0.2, 0, 0.2].map((z) => (
          <mesh key={z} material={k.glass} position={[house.w / 2 + 0.002, house.h * 0.72, z]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.01, 0.16, 0.17]} />
          </mesh>
        ))}
        {([1, -1] as const).map((side) =>
          [-0.14, 0.12].map((x) => (
            <mesh key={`${side}${x}`} material={k.glass} position={[x, house.h * 0.72, side * (house.d / 2 + 0.002)]}>
              <boxGeometry args={[0.18, 0.14, 0.01]} />
            </mesh>
          ))
        )}
        {/* a rail of trim under the windows */}
        <mesh material={painted(p.trim)} position={[0, house.h * 0.52, 0]}>
          <boxGeometry args={[house.w + 0.012, 0.02, house.d + 0.012]} />
        </mesh>
        <RoundedBox
          args={[house.w + 0.2, 0.05, house.d + 0.1]}
          radius={0.02}
          smoothness={2}
          material={roof}
          position={[-0.04, house.h + 0.025, 0]}
          castShadow
        />
        {/* radar, horn, searchlight, whips */}
        <mesh material={metal(k.white)} position={[-0.05, house.h + 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.06, 18]} />
        </mesh>
        <mesh material={metal(k.white)} position={[-0.05, house.h + 0.135, 0]}>
          <sphereGeometry args={[0.07, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={metal(k.chrome)} position={[0.2, house.h + 0.08, 0.18]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.025, 0.09, 12, 1, true]} />
        </mesh>
        <mesh material={metal(k.chrome)} position={[0.22, house.h + 0.08, -0.16]}>
          <sphereGeometry args={[0.03, 12, 10]} />
        </mesh>
        <Rod a={[-0.22, house.h + 0.05, 0.25]} b={[-0.3, house.h + 0.62, 0.27]} r={0.005} material={metal(k.white)} />
        <Rod a={[-0.22, house.h + 0.05, -0.25]} b={[-0.28, house.h + 0.5, -0.27]} r={0.005} material={metal(k.white)} />
        {/* exhaust stack */}
        <mesh material={k.rubber} position={[-house.w / 2 + 0.02, house.h + 0.08, -house.d / 2 + 0.03]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.36, 10]} />
        </mesh>
        <mesh material={metal(k.chrome)} position={[-house.w / 2 + 0.02, house.h + 0.27, -house.d / 2 + 0.03]}>
          <cylinderGeometry args={[0.034, 0.03, 0.03, 10]} />
        </mesh>
        {/* life ring on the back of the house */}
        <group position={[-house.w / 2 - 0.012, house.h * 0.55, 0.14]} rotation={[0, -Math.PI / 2, 0]}>
          <LifeRing r={0.065} accent={p.accent} />
        </group>
      </group>
      {/* hauler davit on the starboard rail */}
      <Rod
        a={[0.0, deckY, -at(0).hb + 0.06]}
        b={[0.0, deckY + 0.42, -at(0).hb + 0.06]}
        r={0.012}
        material={metal(k.steel)}
      />
      <Rod
        a={[0.0, deckY + 0.42, -at(0).hb + 0.06]}
        b={[0.0, deckY + 0.4, -at(0).hb - 0.12]}
        r={0.01}
        material={metal(k.steel)}
      />
      <mesh material={metal(k.steel)} position={[0.0, deckY + 0.36, -at(0).hb - 0.12]}>
        <sphereGeometry args={[0.025, 10, 8]} />
      </mesh>
      {/* the work deck: traps, a coil of line, buoys on the rail */}
      <Trap at={[-0.55, deckY + 0.075, 0.18]} turn={0.1} />
      <Trap at={[-0.55, deckY + 0.205, 0.15]} turn={-0.15} />
      <Trap at={[-0.82, deckY + 0.075, -0.12]} turn={0.25} />
      <mesh material={k.darkRope} position={[-0.3, deckY + 0.02, -0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.07, 0.022, 8, 20]} />
      </mesh>
      {[-0.2, -0.42, -0.64].map((x, i) => (
        <Buoy
          key={x}
          at={[x, at(x).y - 0.02, at(x).hb + 0.03]}
          a={i % 2 ? p.accent : p.trim}
          b={i % 2 ? p.trim : p.accent}
        />
      ))}
      {/* steadying sail on a little mizzen at the stern */}
      <Rod a={[-1.05, at(-1.05).y, 0]} b={[-1.05, at(-1.05).y + 0.75, 0]} r={0.012} material={k.varnish} />
      <mesh
        geometry={riding}
        material={k.sail(p.sail, p.sailPattern, p.accent)}
        position={[-1.07, at(-1.05).y + 0.08, 0]}
        castShadow
      />
      <NavLights x={0.8} y={at(0.8).y + 0.01} z={at(0.8).hb - 0.02} />
      {/* in the Garage the boat is shown on her own */}
      {!showroom && (
        <Crew at={[-0.3, deckY, 0.12]} turn={0.4} coat="#e8b33a" hat="souwester" hatColor="#e8b33a" pose="wave" />
      )}
      <Fenders
        rig={rig}
        spots={[
          [0.5, at(0.5).y - 0.06, at(0.5).hb + 0.035],
          [-0.3, at(-0.3).y - 0.06, at(-0.3).hb + 0.035],
          [-0.8, at(-0.8).y - 0.06, at(-0.8).hb + 0.035]
        ]}
      />
      {/* below the waterline: the long keel, the propeller turning in its aperture, the skeg shoe and the rudder */}
      <Wet geometry={appendages.keel} material={bottom} />
      <Rod a={[-0.9, -0.49, 0]} b={[-1.0, -0.49, 0]} r={0.012} material={metal(k.steel)} />
      <Propeller at={[-1.02, -0.49, 0]} r={0.075} blades={4} spin={rig} />
      <Wet geometry={appendages.shoe} material={bottom} position={[-1.06, -0.565, 0]} />
      <Wet geometry={appendages.rudder} material={bottom} />
      <Cleat at={[0.95, at(0.95).y - 0.01, 0]} size={1.2} />
      {([1, -1] as const).map((side) => (
        <Cleat key={side} at={[-1.0, at(-1.0).y - 0.02, side * (at(-1.0).hb - 0.08)]} size={1.1} />
      ))}
    </group>
  )
}

// ─── Sloop ──────────────────────────────────────────────────────────────────────

const SLOOP: HullSpec = VESSEL_CLASS_SPECS.sloop.hull

/**
 * A triangular sail built with its luff on the local y axis (tack at the origin, head at `luff` up) and the clew
 * out along -x, so scaling x furls it to its stay and scaling y lowers it to its foot.
 */
export function sailGeometry(luff: number, clewX: number, clewY: number, belly: number) {
  const n = 12
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const a = i / n
      const b = j / n
      const x = clewX * b * (1 - a)
      const y = luff * a + clewY * b * (1 - a)
      const z = belly * Math.sin(Math.PI * b) * (1 - a * 0.6) * (1 - a)
      pos.push(x, y, z)
      uv.push(1 - b * (1 - a), a)
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const q = i * (n + 1) + j
      idx.push(q, q + n + 1, q + 1, q + 1, q + n + 1, q + n + 2)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Sloop({ p, rig, showroom }: { p: VesselLook; rig: Rig; showroom?: boolean }) {
  // painted in the member's finish; fittings take their equipment colour when they've chosen one
  const painted = (hex: string) => enamel(hex, p.finish)
  const metal = (original: Material) => (p.equipment ? enamel(p.equipment, p.finish) : original)
  const deckMat = p.deck ? enamel(p.deck, p.finish) : null
  const k = kit()
  const at = useStations(SLOOP)
  const paint = useMemo<HullPaint>(
    () => ({ topsides: p.hull, stripe: p.accent, bottom: p.bottom, sheerLine: p.trim }),
    [p]
  )
  const MAST_X = SLOOP_MAST.x
  const MAST_H = SLOOP_MAST.h
  const BOOM_Y = 0.48
  const deck = at(MAST_X).y - 0.02
  const bowX = 1.08
  const bowY = at(bowX).y
  const forestay = {
    a: [bowX, bowY, 0] as [number, number, number],
    b: [MAST_X, deck + MAST_H * 0.86, 0] as [number, number, number]
  }
  const jibAngle = Math.atan2(forestay.a[0] - forestay.b[0], forestay.b[1] - forestay.a[1])
  const jibLuff = Math.hypot(forestay.a[0] - forestay.b[0], forestay.b[1] - forestay.a[1])
  const main = useMemo(() => sailGeometry(MAST_H - BOOM_Y - 0.14, -1.08, 0.0, 0.12), [])
  const jib = useMemo(() => sailGeometry(jibLuff * 0.97, -0.62, 0.32, 0.08), [jibLuff])
  const mainRef = useRef<Group>(null)
  const jibRef = useRef<Group>(null)
  const coverRef = useRef<Group>(null)
  const boomRef = useRef<Group>(null)
  useFrame(({ clock }) => {
    const h = rig.hoist
    if (mainRef.current) mainRef.current.scale.set(1, Math.max(0.04, h), 1)
    if (jibRef.current) jibRef.current.scale.set(Math.max(0.03, h), 1, Math.max(0.2, h))
    if (coverRef.current) coverRef.current.visible = h < 0.5
    if (boomRef.current) boomRef.current.rotation.y = (0.16 + Math.sin(clock.elapsedTime * 0.6) * 0.04) * h
  })
  const cabinMat = painted(p.cabin)
  const stanchions = [-0.85, -0.45, 0.05, 0.5]
  const bottom = painted(p.bottom)
  const appendages = useMemo(
    () => ({
      keel: fin(
        [
          [-0.08, -0.33],
          [0.42, -0.33],
          [0.12, -0.86],
          [-0.18, -0.86]
        ],
        0.05
      ),
      rudder: fin(
        [
          [-0.78, -0.33],
          [-0.92, -0.33],
          [-0.93, -0.68],
          [-0.85, -0.69]
        ],
        0.03
      ),
      bulb: new CapsuleGeometry(0.048, 0.3, 6, 12)
    }),
    []
  )
  return (
    <group>
      <Hull finish={p.finish} spec={SLOOP} paint={paint} rubRail={k.varnish} deck={[{ material: deckMat ?? k.teak }]} />
      {/* coachroof with portholes, a sliding hatch and a canvas dodger */}
      <group position={[0.18, deck, 0]}>
        <RoundedBox
          args={[0.82, 0.16, 0.5]}
          radius={0.05}
          smoothness={3}
          material={cabinMat}
          position={[0, 0.08, 0]}
          castShadow
          receiveShadow
        />
        <RoundedBox
          args={[0.84, 0.025, 0.52]}
          radius={0.012}
          smoothness={2}
          material={deckMat ?? k.teak}
          position={[0, 0.165, 0]}
          castShadow
        />
        {([1, -1] as const).map((side) =>
          [-0.24, 0.0, 0.24].map((x) => (
            <group key={`${side}${x}`} position={[x, 0.085, side * 0.252]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
              <Porthole r={0.028} />
            </group>
          ))
        )}
        <RoundedBox
          args={[0.2, 0.03, 0.22]}
          radius={0.012}
          smoothness={2}
          material={k.varnish}
          position={[-0.3, 0.19, 0]}
          castShadow
        />
        <mesh
          material={k.cushion(p.accent)}
          position={[-0.36, 0.16, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1, 0.7]}
          castShadow
        >
          <cylinderGeometry args={[0.2, 0.2, 0.46, 18, 1, false, 0, Math.PI]} />
        </mesh>
      </group>
      {/* cockpit coamings and the tiller */}
      {([1, -1] as const).map((side) => (
        <mesh key={side} material={k.varnish} position={[-0.62, deck + 0.05, side * (at(-0.62).hb - 0.09)]} castShadow>
          <boxGeometry args={[0.58, 0.08, 0.025]} />
        </mesh>
      ))}
      <Rod a={[-1.04, deck + 0.04, 0]} b={[-0.66, deck + 0.13, 0.02]} r={0.013} material={k.varnish} />
      {/* mast, spreaders and standing rigging */}
      <mesh material={metal(k.steel)} position={[MAST_X, deck + MAST_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.026, MAST_H, 10]} />
      </mesh>
      <Rod a={[MAST_X, deck + 1.75, 0.26]} b={[MAST_X, deck + 1.75, -0.26]} r={0.007} material={metal(k.steel)} />
      {([1, -1] as const).map((side) => (
        <group key={side}>
          <Rod
            a={[MAST_X, deck + MAST_H - 0.04, 0]}
            b={[MAST_X, deck + 1.75, side * 0.26]}
            r={0.0035}
            material={metal(k.chrome)}
          />
          <Rod
            a={[MAST_X, deck + 1.75, side * 0.26]}
            b={[MAST_X - 0.04, at(MAST_X).y, side * (at(MAST_X).hb - 0.02)]}
            r={0.0035}
            material={metal(k.chrome)}
          />
        </group>
      ))}
      <Rod a={forestay.a} b={forestay.b} r={0.004} material={metal(k.chrome)} />
      <Rod
        a={[-1.1, at(-1.1).y + 0.02, 0]}
        b={[MAST_X, deck + MAST_H - 0.02, 0]}
        r={0.0035}
        material={metal(k.chrome)}
      />
      {/* boom and mainsail; the sail drops onto the boom under a cover once moored */}
      <group ref={boomRef} position={[MAST_X, deck + BOOM_Y, 0]}>
        <mesh material={k.varnish} position={[-0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.016, 1.12, 8]} />
        </mesh>
        <group ref={mainRef} position={[-0.02, 0.03, 0]}>
          <mesh geometry={main} material={k.sail(p.sail, p.sailPattern, p.accent)} castShadow />
        </group>
        <group ref={coverRef} visible={false}>
          <mesh material={k.cushion(p.accent)} position={[-0.5, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.045, 0.82, 6, 12]} />
          </mesh>
        </group>
      </group>
      {/* jib on the forestay, furling to it */}
      <group position={forestay.a} rotation={[0, 0, jibAngle]}>
        <group ref={jibRef}>
          <mesh
            geometry={jib}
            material={k.sail(p.sail, p.sailPattern, p.accent)}
            position={[-0.01, 0.04, 0]}
            castShadow
          />
        </group>
      </group>
      <mesh
        material={k.cushion(p.accent)}
        position={[(forestay.a[0] + forestay.b[0]) / 2, (forestay.a[1] + forestay.b[1]) / 2, 0]}
        rotation={[0, 0, jibAngle]}
      >
        <cylinderGeometry args={[0.012, 0.02, jibLuff * 0.8, 8]} />
      </mesh>
      {/* pulpit, stanchions and lifelines */}
      <Rail
        points={[
          [0.72, at(0.72).y + 0.17, at(0.72).hb - 0.04],
          [1.0, at(1.0).y + 0.17, 0.0],
          [0.72, at(0.72).y + 0.17, -(at(0.72).hb - 0.04)]
        ]}
        r={0.006}
        material={metal(k.chrome)}
      />
      {([1, -1] as const).map((side) => (
        <group key={side}>
          {stanchions.map((x) => (
            <Rod
              key={x}
              a={[x, at(x).y, side * (at(x).hb - 0.04)]}
              b={[x, at(x).y + 0.17, side * (at(x).hb - 0.04)]}
              r={0.005}
              material={metal(k.chrome)}
            />
          ))}
          <Rail
            points={[...stanchions, 0.72].map(
              (x) => [x, at(x).y + 0.17, side * (at(x).hb - 0.04)] as [number, number, number]
            )}
            r={0.003}
            material={metal(k.chrome)}
          />
        </group>
      ))}
      <NavLights x={0.92} y={at(0.92).y + 0.01} z={at(0.92).hb - 0.02} />
      {/* in the Garage the boat is shown on her own */}
      {!showroom && (
        <Crew
          at={[-0.82, deck - 0.02, 0.1]}
          turn={0.3}
          coat={p.trim === '#fbf6ec' ? '#26385f' : p.trim}
          hat="sunhat"
          hatColor="#f1e3c2"
        />
      )}
      <Fenders
        rig={rig}
        spots={[
          [0.4, at(0.4).y - 0.04, at(0.4).hb + 0.035],
          [-0.4, at(-0.4).y - 0.04, at(-0.4).hb + 0.035]
        ]}
      />
      {/* sheet winches on the coamings, and cleats fore and aft */}
      {([1, -1] as const).map((side) => (
        <group key={side} position={[-0.42, deck + 0.09, side * (at(-0.42).hb - 0.09)]}>
          <mesh material={metal(k.chrome)} position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.028, 0.04, 14]} />
          </mesh>
          <mesh material={k.rubber} position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.012, 10]} />
          </mesh>
        </group>
      ))}
      <Cleat at={[0.85, at(0.85).y - 0.01, 0]} />
      {([1, -1] as const).map((side) => (
        <Cleat key={side} at={[-0.98, at(-0.98).y - 0.01, side * (at(-0.98).hb - 0.06)]} size={0.85} />
      ))}
      {/* below the waterline: the fin keel and its lead bulb, the spade rudder, and the auxiliary's prop on its strut */}
      <Wet geometry={appendages.keel} material={bottom} />
      <Wet geometry={appendages.bulb} material={k.rubber} position={[-0.03, -0.87, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Wet geometry={appendages.rudder} material={bottom} />
      <Rod a={[-0.42, -0.33, 0]} b={[-0.52, -0.42, 0]} r={0.008} material={metal(k.steel)} />
      <Propeller at={[-0.55, -0.42, 0]} r={0.05} blades={2} spin={rig} />
    </group>
  )
}

export function Boat({
  kind,
  look,
  rig,
  name,
  showroom
}: {
  kind: VesselClassId
  look: VesselLook
  rig: Rig
  /** The name on a modular boat's nameplate */
  name?: string
  /** In the Garage (no harbor around it): the boat draws the stowed anchor the harbor's anchor system would */
  showroom?: boolean
}) {
  if (kind === 'modular') return <Modular p={look} rig={rig} name={name} showroom={showroom} />
  const spec = VESSEL_CLASS_SPECS[kind]
  return (
    <group position={[0, spec.lift, 0]}>
      {kind === 'runabout' && <Runabout p={look} rig={rig} showroom={showroom} />}
      {kind === 'lobster' && <Lobster p={look} rig={rig} showroom={showroom} />}
      {kind === 'sloop' && <Sloop p={look} rig={rig} showroom={showroom} />}
      <BowRoller at={spec.mounts.roller} />
      <Accessories kind={kind} look={look} />
    </group>
  )
}
