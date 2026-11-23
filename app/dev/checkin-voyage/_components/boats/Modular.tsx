'use client'

import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Material,
  MeshStandardMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector3
} from 'three'
import { allocate, Placement } from '@/lib/vessel/items'
import { HullPaint, hullStations } from '../../_lib/hull'
import { Rig } from '../../_lib/store'
import { Vec3 } from '../../_lib/vessel/classes'
import { VesselLook } from '../../_lib/vessel/look'
import { layoutOf, ModularLayout, Zone } from '../../_lib/vessel/modular'
import { Burgee, Flag } from './accessories'
import { Buoy, fin, Hull, NavLights, sailGeometry, Trap } from './Boats'
import { BowRoller, Cleat, Crew, enamel, Fender, kit, LifeRing, Propeller, Rail, Rod, Wet } from './kit'

// The modular boat: every fitted part a real piece of the model, standing where its layout (vessel/modular.ts) puts
// it. The hull is lofted for its length, beam, depth and bow; consoles, seats, canopies, the flybridge, engines, the
// rig and every piece of gear are their own meshes, in the same toy-like style as the rest of the harbor. Every painted
// surface takes the member's colour and finish (so it can be matte black from stem to stern); bare wood and chrome stay
// as they come until the deck or fittings are painted.

type Paints = {
  p: VesselLook
  k: ReturnType<typeof kit>
  lay: ModularLayout
  painted: (hex: string) => MeshStandardMaterial
  metal: (original: Material) => Material
  wood: Material
}

export function Modular({ p, rig, name, showroom }: { p: VesselLook; rig: Rig; name?: string; showroom?: boolean }) {
  const lay = layoutOf(p.parts ?? [], p.stage)
  const k = kit()
  const painted = (hex: string) => enamel(hex, p.finish)
  const metal = (original: Material) => (p.equipment ? enamel(p.equipment, p.finish) : original)
  const wood = p.deck ? enamel(p.deck, p.finish) : k.teak
  const ps: Paints = { p, k, lay, painted, metal, wood }
  const { has, at, stern, bow } = lay
  // without striping the boot stripe is simply painted in the hull colour
  const striped = (p.parts ?? []).includes('decor:stripe')
  const paint = useMemo<HullPaint>(
    () => ({ topsides: p.hull, stripe: striped ? p.accent : p.hull, bottom: p.bottom, sheerLine: p.trim }),
    [p.hull, p.accent, p.bottom, p.trim, striped]
  )
  return (
    <group position={[0, lay.spec.lift, 0]}>
      <Hull
        finish={p.finish}
        spec={lay.hull}
        paint={paint}
        rubRail={has('hull:rub-rail') ? painted(p.trim) : null}
        deck={[
          { material: wood, from: 0, to: 0.62 },
          { material: painted(p.hull === '#fbf6ec' ? p.trim : p.hull), from: 0.6, to: 0.985 }
        ]}
      />
      <Structure {...ps} />
      <Seating {...ps} />
      <HelmParts {...ps} />
      {lay.outboards.map((z) => (
        <Outboard key={z} at={[stern - 0.03, at(stern).y - 0.02, z]} rig={rig} {...ps} />
      ))}
      <Stern {...ps} rig={rig} />
      <Zoned {...ps} />
      <DeckGear {...ps} showroom={showroom} />
      <Canopy {...ps} />
      {lay.flybridge && <Flybridge {...ps} />}
      {lay.skyRoof && <SkyRoof {...ps} />}
      {lay.mast && <Sailplan {...ps} rig={rig} />}
      <Identity {...ps} rig={rig} name={name} />
      <NavLights x={bow - 0.3} y={at(bow - 0.3).y + 0.01} z={at(bow - 0.3).hb - 0.02} />
      {/* the Garage shows the boat on her own; on the harbor's TV her skipper is aboard */}
      {!showroom && (
        <Crew
          at={lay.crew.at}
          turn={lay.crew.turn}
          coat={p.trim === '#fbf6ec' ? '#2c5aa0' : p.trim}
          hat={has('top:mast') ? 'sunhat' : has('top:wheelhouse') ? 'souwester' : has('helm:tiller') ? 'beanie' : 'cap'}
          hatColor={has('top:wheelhouse') ? '#e8b33a' : p.accent}
          pose={lay.crew.pose}
        />
      )}
    </group>
  )
}

// ─── hull & structure ───────────────────────────────────────────────────────────

function Structure({ lay, p, k, painted, metal }: Paints) {
  const { has, at, stern, bow, length: L } = lay
  const sheer = useMemo(() => {
    const n = 14
    return ([1, -1] as const).map((side) =>
      Array.from({ length: n + 1 }, (_, i) => {
        const x = stern + 0.04 + ((bow - 0.08 - stern - 0.04) * i) / n
        return [x, at(x).y + 0.006, side * Math.max(at(x).hb - 0.014, 0.01)] as Vec3
      })
    )
  }, [at, stern, bow])
  const keel = useMemo(() => {
    const st = hullStations(lay.hull)
    const under = (x: number) => -st.keel(Math.min(1, Math.max(0, x / L + 0.5))) + 0.03
    const from = stern + 0.12
    const to = 0.32 * L
    const top = Array.from({ length: 9 }, (_, i) => from + ((to - from) * i) / 8).map(
      (x) => [x, under(x)] as [number, number]
    )
    const depth = under(from) - 0.07
    return fin([...top, [to, under(to) - 0.015], [from + 0.3, depth], [from, depth]], 0.035)
  }, [lay.hull, L, stern])
  return (
    <group>
      {has('hull:gunwale-caps') &&
        sheer.map((pts, i) => <Rail key={i} points={pts} r={0.012} material={p.deck ? painted(p.deck) : k.varnish} />)}
      {has('hull:transom') && (
        <group position={[stern + 0.012, at(stern).y - 0.07, 0]}>
          <RoundedBox
            args={[0.03, 0.13, at(stern).hb * 1.5]}
            radius={0.01}
            smoothness={2}
            material={painted(p.trim)}
            castShadow
          />
          <mesh material={metal(k.steel)} position={[-0.03, 0.06, 0]}>
            <boxGeometry args={[0.03, 0.02, 0.2]} />
          </mesh>
        </group>
      )}
      {has('hull:side-rails') && <SideRails lay={lay} k={k} metal={metal} />}
      {has('hull:keel') && !has('top:mast') && <Wet geometry={keel} material={painted(p.bottom)} />}
      {has('hull:skiff') && has('helm:tiller') && <StarterKit lay={lay} p={p} k={k} painted={painted} />}
    </group>
  )
}

/** The starter's well-used kit: a pair of oars, a bailer and a plywood patch in the deck */
function StarterKit({ lay, p, k, painted }: Pick<Paints, 'lay' | 'p' | 'k' | 'painted'>) {
  const { at, length: L } = lay
  const oar = p.deck ? painted(p.deck) : k.varnish
  const plywood = p.deck ? painted(p.deck) : enamel('#b9986a', 'matte')
  return (
    <group>
      {[0.13, -0.13].map((z, i) => (
        <group key={z} position={[0.02 * L, at(0).deck + 0.03, z]} rotation={[0, i ? 0.06 : -0.04, 0]}>
          <mesh material={oar} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.62 * L, 6]} />
          </mesh>
          <mesh material={oar} position={[0.31 * L, 0, 0]} castShadow>
            <boxGeometry args={[0.16, 0.008, 0.05]} />
          </mesh>
        </group>
      ))}
      <mesh
        material={painted(p.equipment ?? '#d9822b')}
        position={[-0.22 * L, at(-0.22 * L).deck + 0.04, 0.13]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.032, 0.07, 12]} />
      </mesh>
      <mesh material={plywood} position={[-0.02 * L, at(0).deck + 0.003, -0.06]} rotation={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[0.16, 0.006, 0.13]} />
      </mesh>
    </group>
  )
}

function SideRails({ lay, k, metal }: Pick<Paints, 'lay' | 'k' | 'metal'>) {
  const { at, bow, stern, length: L } = lay
  const n = Math.round(L * 2)
  const posts = Array.from({ length: n }, (_, i) => stern + 0.14 + ((bow - 0.42 - stern - 0.14) * i) / (n - 1))
  const h = 0.13
  return (
    <>
      {([1, -1] as const).map((side) => (
        <group key={side}>
          {posts.map((x) => (
            <Rod
              key={x}
              a={[x, at(x).y, side * (at(x).hb - 0.04)]}
              b={[x, at(x).y + h, side * (at(x).hb - 0.04)]}
              r={0.005}
              material={metal(k.chrome)}
            />
          ))}
          <Rail
            points={[...posts, bow - 0.2].map((x) => [x, at(x).y + h, side * Math.max(at(x).hb - 0.04, 0.03)] as Vec3)}
            r={0.006}
            material={metal(k.chrome)}
          />
        </group>
      ))}
      <Rail
        points={[
          [bow - 0.2, at(bow - 0.2).y + h, Math.max(at(bow - 0.2).hb - 0.04, 0.03)],
          [bow - 0.07, at(bow - 0.07).y + h, 0],
          [bow - 0.2, at(bow - 0.2).y + h, -Math.max(at(bow - 0.2).hb - 0.04, 0.03)]
        ]}
        r={0.006}
        material={metal(k.chrome)}
      />
    </>
  )
}

// ─── seating & interior ─────────────────────────────────────────────────────────

function Seating({ lay, p, k, painted, metal }: Paints) {
  const { has, at, seats } = lay
  const cushion = k.cushion(p.seats)
  const plank = painted(p.seats)
  const across = (x: number) => at(x).hb * 2 - 0.05
  return (
    <group>
      {has('seat:bench') && (
        <mesh material={plank} position={[seats.fwd, at(seats.fwd).deck + 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.11, 0.025, across(seats.fwd)]} />
        </mesh>
      )}
      {has('seat:center') && (
        <group position={[seats.center, at(seats.center).deck, 0]}>
          <mesh material={plank} position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[0.13, 0.025, across(seats.center)]} />
          </mesh>
          <RoundedBox
            args={[0.12, 0.035, across(seats.center) - 0.08]}
            radius={0.015}
            smoothness={2}
            material={cushion}
            position={[0, 0.08, 0]}
            castShadow
          />
        </group>
      )}
      {has('seat:stern') && (
        <group position={[seats.stern, at(seats.stern).deck, 0]}>
          <RoundedBox
            args={[0.14, 0.07, across(seats.stern) - 0.02]}
            radius={0.02}
            smoothness={2}
            material={plank}
            position={[0, 0.035, 0]}
            castShadow
          />
          <RoundedBox
            args={[0.13, 0.035, across(seats.stern) - 0.08]}
            radius={0.015}
            smoothness={2}
            material={cushion}
            position={[0, 0.085, 0]}
            castShadow
          />
        </group>
      )}
      {has('seat:cooler') && (
        <group position={[seats.cooler, at(seats.cooler).deck, 0]}>
          <RoundedBox
            args={[0.14, 0.1, 0.22]}
            radius={0.02}
            smoothness={2}
            material={k.white}
            position={[0, 0.05, 0]}
            castShadow
          />
          <RoundedBox
            args={[0.13, 0.03, 0.21]}
            radius={0.012}
            smoothness={2}
            material={cushion}
            position={[0, 0.115, 0]}
            castShadow
          />
        </group>
      )}
      {has('seat:post') && (
        <group position={seats.helm}>
          <Rod a={[0, 0, 0]} b={[0, 0.14, 0]} r={0.016} material={metal(k.steel)} />
          <RoundedBox
            args={[0.1, 0.16, 0.26]}
            radius={0.03}
            smoothness={3}
            material={cushion}
            position={[0, 0.2, 0]}
            castShadow
          />
        </group>
      )}
      {has('seat:captain') && <Chair at={seats.helm} cushion={cushion} metal={metal(k.chrome)} />}
      {has('seat:passenger') && <Chair at={seats.passenger} cushion={cushion} metal={metal(k.chrome)} />}
      {has('seat:storage') &&
        [
          [0.36 * lay.length, 0.07],
          [0.36 * lay.length, -0.07],
          [-0.28 * lay.length, 0]
        ].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, at(x).deck + 0.004, z]}>
            <mesh material={painted(p.trim)} receiveShadow>
              <boxGeometry args={[0.12, 0.008, 0.11]} />
            </mesh>
            <mesh material={metal(k.chrome)} position={[0.03, 0.007, 0]}>
              <boxGeometry args={[0.012, 0.006, 0.04]} />
            </mesh>
          </group>
        ))}
    </group>
  )
}

/** A high-backed helm chair on a pedestal */
function Chair({ at, cushion, metal }: { at: Vec3; cushion: Material; metal: Material }) {
  return (
    <group position={at}>
      <Rod a={[0, 0, 0]} b={[0, 0.14, 0]} r={0.012} material={metal} />
      <RoundedBox
        args={[0.13, 0.04, 0.13]}
        radius={0.015}
        smoothness={2}
        material={cushion}
        position={[0, 0.16, 0]}
        castShadow
      />
      <RoundedBox
        args={[0.035, 0.16, 0.13]}
        radius={0.015}
        smoothness={2}
        material={cushion}
        position={[-0.06, 0.25, 0]}
        rotation={[0, 0, 0.12]}
        castShadow
      />
      {[0.07, -0.07].map((z) => (
        <mesh key={z} material={cushion} position={[0, 0.2, z]}>
          <boxGeometry args={[0.09, 0.02, 0.018]} />
        </mesh>
      ))}
    </group>
  )
}

// ─── helm & controls ────────────────────────────────────────────────────────────

function HelmParts({ lay, p, k, painted, metal }: Paints) {
  const c = lay.console
  const glow = useMemo(
    () => new MeshStandardMaterial({ color: '#7fd6ff', emissive: '#3fb7ff', emissiveIntensity: 0.9 }),
    []
  )
  if (!c) return null
  const { has } = lay
  const back = -c.len / 2
  return (
    <group position={[c.x, c.y, c.z]}>
      <RoundedBox
        args={[c.len, c.h, c.w]}
        radius={0.03}
        smoothness={3}
        material={painted(p.cabin)}
        position={[0, c.h / 2, 0]}
        castShadow
        receiveShadow
      />
      {/* the dash, sloping toward the helmsman */}
      <mesh material={painted(p.trim)} position={[back + 0.03, c.h + 0.012, 0]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.08, 0.02, c.w - 0.02]} />
      </mesh>
      {c.kind === 'nav' && (
        <mesh material={glow} position={[back + 0.02, c.h + 0.06, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.008, 0.07, c.w * 0.5]} />
        </mesh>
      )}
      {has('helm:wheel') ? (
        <group position={[back - 0.012, c.h * 0.82, c.kind === 'side' ? 0 : -0.04]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={k.varnish}>
            <torusGeometry args={[0.06, 0.008, 8, 22]} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} material={k.bronze} rotation={[0, 0, (i * Math.PI) / 3]}>
              <boxGeometry args={[0.15, 0.006, 0.006]} />
            </mesh>
          ))}
        </group>
      ) : (
        <mesh
          material={k.rubber}
          position={[back - 0.008, c.h * 0.82, c.kind === 'side' ? 0 : -0.04]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[0.045, 0.008, 8, 20]} />
        </mesh>
      )}
      {has('helm:windshield') && (
        <>
          <mesh material={k.tint} position={[c.len / 2 - 0.03, c.h + 0.07, 0]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.01, 0.15, c.w - 0.02]} />
          </mesh>
          <mesh material={metal(k.chrome)} position={[c.len / 2 - 0.005, c.h + 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, c.w - 0.02, 6]} />
          </mesh>
        </>
      )}
      {has('helm:throttle') && (
        <group position={[back + 0.01, c.h * 0.85, c.w / 2 - 0.05]}>
          <mesh material={k.rubber}>
            <boxGeometry args={[0.05, 0.04, 0.04]} />
          </mesh>
          <Rod a={[0, 0.02, 0]} b={[-0.04, 0.08, 0]} r={0.006} material={metal(k.chrome)} />
          <mesh material={k.rubber} position={[-0.04, 0.085, 0]}>
            <sphereGeometry args={[0.012, 8, 6]} />
          </mesh>
        </group>
      )}
      {has('helm:instruments') &&
        [-0.07, 0, 0.07].map((z, i) => (
          <mesh
            key={z}
            material={i === 1 ? k.chrome : k.white}
            position={[back - 0.004, c.h * 0.62, z * (c.w / 0.34)]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.022, 0.022, 0.008, 14]} />
          </mesh>
        ))}
    </group>
  )
}

// ─── propulsion & stern ─────────────────────────────────────────────────────────

const lowerUnit = () => ({
  leg: new BoxGeometry(0.07, 0.4, 0.035),
  gearcase: new CapsuleGeometry(0.024, 0.1, 4, 10),
  skeg: new BoxGeometry(0.06, 0.05, 0.008)
})

/** An outboard on the transom: the small one is old and a little tilted; on a tiller boat it's steered by its arm */
function Outboard({ at, rig, lay, p, k, painted, metal }: Paints & { at: Vec3; rig: Rig }) {
  const lower = useMemo(() => lowerUnit(), [])
  const { has } = lay
  const small = has('engine:small')
  const cowl = painted(p.equipment ?? (small ? '#6f7f78' : '#2a2f36'))
  return (
    <group position={at} rotation={[0, 0, small ? -0.08 : 0]} scale={small ? 0.72 : 1}>
      <RoundedBox args={[0.18, 0.22, 0.15]} radius={small ? 0.035 : 0.05} smoothness={4} material={cowl} castShadow />
      {has('engine:cowl') && (
        <>
          <mesh material={painted(p.accent)} position={[0.005, 0.03, 0]}>
            <boxGeometry args={[0.185, 0.025, 0.155]} />
          </mesh>
          <mesh material={metal(k.chrome)} position={[0.005, -0.075, 0]}>
            <boxGeometry args={[0.186, 0.012, 0.156]} />
          </mesh>
          {[-0.03, 0, 0.03].map((y) => (
            <mesh key={y} material={k.rubber} position={[-0.092, 0.06 + y, 0]}>
              <boxGeometry args={[0.004, 0.012, 0.09]} />
            </mesh>
          ))}
        </>
      )}
      {has('helm:tiller') && <Rod a={[0.08, -0.02, 0]} b={[0.42, 0.03, 0]} r={0.014} material={k.rubber} />}
      <Wet geometry={lower.leg} material={cowl} position={[0.01, -0.28, 0]} />
      <mesh material={metal(k.steel)} position={[0.025, -0.41, 0]}>
        <boxGeometry args={[0.13, 0.008, 0.08]} />
      </mesh>
      <Wet geometry={lower.gearcase} material={cowl} position={[0.01, -0.47, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Wet geometry={lower.skeg} material={cowl} position={[0, -0.51, 0]} />
      <Propeller
        at={[-0.06, -0.47, 0]}
        r={has('engine:prop') ? 0.062 : 0.05}
        blades={has('engine:prop') ? 4 : 3}
        spin={rig}
      />
    </group>
  )
}

// ─── deck & work gear ───────────────────────────────────────────────────────────

function DeckGear({ lay, p, k, painted, metal, showroom }: Paints & { showroom?: boolean }) {
  const { has, at, stern, bow, spots, length: L } = lay
  return (
    <group>
      {has('deck:cleats') && (
        <>
          <Cleat at={[bow - 0.16, at(bow - 0.16).y - 0.008, 0]} size={0.8 + 0.1 * L} />
          {([1, -1] as const).map((side) => (
            <Cleat
              key={side}
              at={[stern + 0.1, at(stern + 0.1).y - 0.012, side * (at(stern + 0.1).hb - 0.06)]}
              size={0.85}
            />
          ))}
        </>
      )}
      {has('deck:anchor') && (
        <>
          <BowRoller at={lay.spec.mounts.roller} />
          {/* stowed on its roller here; on the harbor's TV the anchor is drawn (and let go) by the anchor system */}
          {showroom && <StowedAnchor at={lay.spec.mounts.roller} size={lay.spec.anchor} metal={metal(k.galvanised)} />}
        </>
      )}
      {has('deck:rods') &&
        spots.quarters.map((q, i) => (
          <group key={i} position={q} rotation={[i ? -0.5 : 0.5, 0, 0.55]}>
            <Rod a={[0, 0, 0]} b={[0, 0.06, 0]} r={0.008} material={metal(k.chrome)} />
            <Rod a={[0, 0.02, 0]} b={[0, 0.62, 0]} r={0.004} material={k.rubber} />
            <mesh material={metal(k.chrome)} position={[0.012, 0.14, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.02, 10]} />
            </mesh>
          </group>
        ))}
      {has('deck:antenna') && (
        <group position={spots.antenna}>
          <Rod a={[0, 0, 0]} b={[-0.06, 0.5, 0]} r={0.005} material={metal(k.white)} />
        </group>
      )}
      {has('deck:work-lights') && spots.roof && (
        <WorkLights at={spots.roof[1]} w={(lay.canopy?.w ?? lay.poles?.w ?? 0.5) * 0.6} metal={metal(k.chrome)} />
      )}
      {has('deck:bumpers') &&
        ([1, -1] as const).flatMap((side) =>
          [0.15, -0.22].map((f) => {
            const x = f * L
            return (
              <Fender
                key={`${side}${f}`}
                at={[x, at(x).y - 0.01, side * (at(x).hb + 0.035)]}
                material={painted(p.accent)}
              />
            )
          })
        )}
    </group>
  )
}

/** A plough anchor seated on the bow roller */
function StowedAnchor({ at, size, metal }: { at: Vec3; size: number; metal: Material }) {
  const s = size / 0.12
  return (
    <group position={[at[0] + 0.05, at[1] - 0.02, at[2]]} rotation={[0, 0, -1.2]} scale={s}>
      <mesh material={metal} castShadow>
        <cylinderGeometry args={[0.006, 0.008, 0.11, 6]} />
      </mesh>
      <mesh material={metal} position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.05, 3]} />
      </mesh>
    </group>
  )
}

function WorkLights({ at, w, metal }: { at: Vec3; w: number; metal: Material }) {
  const lamp = useMemo(
    () => new MeshStandardMaterial({ color: '#fff6dc', emissive: '#fff1c4', emissiveIntensity: 1.1 }),
    []
  )
  return (
    <group position={at}>
      {[w / 2, -w / 2].map((z) => (
        <group key={z} position={[0, -0.02, z]} rotation={[0, 0, -0.5]}>
          <mesh material={metal}>
            <boxGeometry args={[0.04, 0.03, 0.05]} />
          </mesh>
          <mesh material={lamp} position={[0.021, 0, 0]}>
            <boxGeometry args={[0.004, 0.024, 0.042]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Radar({ at, metal }: { at: Vec3; metal: Material }) {
  const bar = useRef<Group>(null)
  useFrame((_, dt) => {
    if (bar.current) bar.current.rotation.y += dt * 1.4
  })
  return (
    <group position={at}>
      <mesh material={metal} position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.06, 18]} />
      </mesh>
      <group ref={bar} position={[0, 0.075, 0]}>
        <mesh material={metal} castShadow>
          <boxGeometry args={[0.2, 0.018, 0.03]} />
        </mesh>
      </group>
    </group>
  )
}

// ─── canopy & upper deck ────────────────────────────────────────────────────────

function Canopy({ lay, p, k, painted, metal }: Paints) {
  const { at } = lay
  const c = lay.canopy
  const poles = lay.poles
  const canvas = useMemo(() => {
    if (c?.kind !== 'bimini') return null
    // a canvas top: a shallow arch across the beam, its edges on the bows
    const segs = 10
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const z = (t - 0.5) * c.w
      const y = Math.sin(Math.PI * t) * 0.06
      pos.push(-c.len / 2, y, z, c.len / 2, y, z)
      if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [c])
  // canvas is seen from above and below, so it's drawn on both faces
  const cloth = useMemo(() => {
    const m = k.cushion(p.roof).clone()
    m.side = DoubleSide
    return m
  }, [k, p.roof])
  return (
    <group>
      {poles &&
        ([1, -1] as const).flatMap((side) =>
          [poles.x - poles.len / 2 + 0.05, poles.x + poles.len / 2 - 0.05].map((x) => (
            <Rod
              key={`${x}${side}`}
              a={[x, at(x).deck, side * (poles.w / 2 - 0.04)]}
              b={[x, poles.y, side * (poles.w / 2 - 0.04)]}
              r={0.012}
              material={metal(k.chrome)}
            />
          ))
        )}
      {poles && !c && (
        <Rail
          points={[
            [poles.x - poles.len / 2 + 0.05, poles.y, poles.w / 2 - 0.04],
            [poles.x + poles.len / 2 - 0.05, poles.y, poles.w / 2 - 0.04],
            [poles.x + poles.len / 2 - 0.05, poles.y, -(poles.w / 2 - 0.04)],
            [poles.x - poles.len / 2 + 0.05, poles.y, -(poles.w / 2 - 0.04)],
            [poles.x - poles.len / 2 + 0.05, poles.y, poles.w / 2 - 0.04]
          ]}
          r={0.01}
          material={metal(k.chrome)}
        />
      )}
      {c?.kind === 'hardtop' && (
        <RoundedBox
          args={[c.len, c.h, c.w]}
          radius={0.015}
          smoothness={2}
          material={painted(p.roof)}
          position={[c.x, c.y + c.h / 2, 0]}
          castShadow
        />
      )}
      {c?.kind === 'bimini' && canvas && (
        <group>
          {([1, -1] as const).flatMap((side) =>
            [c.x - c.len / 2 + 0.03, c.x + c.len / 2 - 0.03].map((x, i) => (
              <Rod
                key={`${x}${side}`}
                a={[x + (i ? 0.08 : -0.08), at(x).y, side * (c.w / 2 - 0.02)]}
                b={[x, c.y, side * (c.w / 2 - 0.02)]}
                r={0.006}
                material={metal(k.chrome)}
              />
            ))
          )}
          <mesh geometry={canvas} material={cloth} position={[c.x, c.y, 0]} castShadow />
        </group>
      )}
      {c?.kind === 'wheelhouse' && <Wheelhouse {...{ lay, p, k, painted, metal, wood: k.teak }} />}
    </group>
  )
}

function Wheelhouse({ lay, p, k, painted, metal }: Paints) {
  const c = lay.canopy!
  const h = c.y - lay.at(c.x).deck
  const fly = !!lay.flybridge
  return (
    <group position={[c.x, lay.at(c.x).deck, 0]}>
      <RoundedBox
        args={[c.len, h, c.w]}
        radius={0.035}
        smoothness={3}
        material={painted(p.cabin)}
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
      />
      {[-0.3, 0, 0.3].map((f) => (
        <mesh key={f} material={k.glass} position={[c.len / 2 + 0.002, h * 0.72, f * c.w]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.01, 0.16, c.w * 0.25]} />
        </mesh>
      ))}
      {([1, -1] as const).map((side) =>
        [-0.22, 0.2].map((f) => (
          <mesh key={`${side}${f}`} material={k.glass} position={[f * c.len, h * 0.72, side * (c.w / 2 + 0.002)]}>
            <boxGeometry args={[c.len * 0.28, 0.14, 0.01]} />
          </mesh>
        ))
      )}
      <mesh material={painted(p.trim)} position={[0, h * 0.52, 0]}>
        <boxGeometry args={[c.len + 0.012, 0.02, c.w + 0.012]} />
      </mesh>
      <RoundedBox
        args={[c.len + (fly ? 0.12 : 0.2), c.h, c.w + (fly ? 0.04 : 0.1)]}
        radius={0.02}
        smoothness={2}
        material={painted(p.roof)}
        position={[-0.03, h + c.h / 2, 0]}
        castShadow
      />
      <mesh material={k.glass} position={[-c.len / 2 - 0.002, h * 0.5, -c.w * 0.18]}>
        <boxGeometry args={[0.01, h * 0.72, 0.14]} />
      </mesh>
      {!fly && (
        <mesh material={metal(k.white)} position={[-c.len / 2 + 0.05, h + 0.12, -c.w / 2 + 0.05]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.2, 10]} />
        </mesh>
      )}
    </group>
  )
}

/** A second level: rail all round, its own helm and seat, a ladder down and an arch for the roof gear */
function Flybridge({ lay, p, k, painted, metal }: Paints) {
  const u = lay.flybridge!
  const aft = u.x - u.len / 2 + 0.03
  const fore = u.x + u.len / 2 - 0.03
  const hw = u.w / 2 - 0.03
  const railY = u.y + 0.2
  const corners: Vec3[] = [
    [aft, railY, hw],
    [fore, railY, hw],
    [fore, railY, -hw],
    [aft, railY, -hw]
  ]
  const deckBelow = lay.at(aft).deck
  return (
    <group>
      <Rail points={[...corners, corners[0]]} r={0.006} material={metal(k.chrome)} />
      {corners.map((c, i) => (
        <Rod key={i} a={[c[0], u.y, c[2]]} b={c} r={0.006} material={metal(k.chrome)} />
      ))}
      <RoundedBox
        args={[0.1, 0.16, u.w * 0.5]}
        radius={0.02}
        smoothness={2}
        material={painted(p.cabin)}
        position={[lay.flyHelm!.console, u.y + 0.08, 0]}
        castShadow
      />
      <mesh material={k.tint} position={[lay.flyHelm!.console + 0.06, u.y + 0.2, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.01, 0.08, u.w * 0.5]} />
      </mesh>
      <RoundedBox
        args={[0.1, 0.06, u.w * 0.55]}
        radius={0.02}
        smoothness={2}
        material={k.cushion(p.seats)}
        position={[lay.flyHelm!.seat, u.y + 0.05, 0]}
        castShadow
      />
      {[0.08, -0.08].map((z) => (
        <Rod
          key={z}
          a={[aft - 0.08, deckBelow, z - u.w * 0.2]}
          b={[aft - 0.03, u.y + 0.05, z - u.w * 0.2]}
          r={0.006}
          material={metal(k.chrome)}
        />
      ))}
      {[0.2, 0.4, 0.6, 0.8].map((f) => {
        const y = deckBelow + (u.y - deckBelow) * f
        return (
          <Rod
            key={f}
            a={[aft - 0.08 + 0.05 * f, y, 0.08 - u.w * 0.2]}
            b={[aft - 0.08 + 0.05 * f, y, -0.08 - u.w * 0.2]}
            r={0.005}
            material={metal(k.chrome)}
          />
        )
      })}
      {([1, -1] as const).map((side) => (
        <Rod
          key={side}
          a={[aft + 0.05, u.y, side * hw]}
          b={[aft + 0.08, u.y + 0.46, side * hw * 0.8]}
          r={0.012}
          material={metal(k.white)}
        />
      ))}
      <Rod
        a={[aft + 0.08, u.y + 0.46, hw * 0.8]}
        b={[aft + 0.08, u.y + 0.46, -hw * 0.8]}
        r={0.014}
        material={metal(k.white)}
      />
    </group>
  )
}

// ─── the rig ────────────────────────────────────────────────────────────────────

/** The sailboat path, piece by piece: a mast with its fin keel, then a boom, rigging, and sails that come down at anchor */
function Sailplan({ lay, p, k, painted, metal, rig }: Paints & { rig: Rig }) {
  const m = lay.mast!
  const { has, at, stern, bow, length: L } = lay
  const tack: Vec3 = [bow - 0.07, at(bow - 0.07).y, 0]
  const hounds: Vec3 = [m.x, m.foot + m.h * 0.86, 0]
  const jibAngle = Math.atan2(tack[0] - hounds[0], hounds[1] - tack[1])
  const jibLuff = Math.hypot(tack[0] - hounds[0], hounds[1] - tack[1])
  const main = useMemo(() => sailGeometry(m.h - m.boomY - 0.14, -m.boomLen + 0.04, 0, 0.12), [m.h, m.boomY, m.boomLen])
  const jib = useMemo(
    () => sailGeometry(jibLuff * 0.97, -Math.min(0.62, (tack[0] - m.x) * 0.9 + 0.1), 0.3, 0.08),
    [jibLuff, m.x, tack]
  )
  const spreader = m.foot + m.h * 0.57
  const sw = at(m.x).hb - 0.02
  const mainRef = useRef<Group>(null)
  const jibRef = useRef<Group>(null)
  const coverRef = useRef<Group>(null)
  const boomRef = useRef<Group>(null)
  const sails = has('top:sails')
  useFrame(({ clock }) => {
    const h = sails ? rig.hoist : 0
    if (mainRef.current) mainRef.current.scale.set(1, Math.max(0.04, h), 1)
    if (jibRef.current) jibRef.current.scale.set(Math.max(0.03, h), 1, Math.max(0.2, h))
    if (coverRef.current) coverRef.current.visible = sails && h < 0.5
    if (boomRef.current) boomRef.current.rotation.y = (0.16 + Math.sin(clock.elapsedTime * 0.6) * 0.04) * h
  })
  const keel = useMemo(() => {
    const s = L / 2.25
    const top = -lay.hull.depth + 0.04
    return {
      fin: fin(
        [
          [-0.08 * s, top],
          [0.42 * s, top],
          [0.12 * s, top - 0.53 * s],
          [-0.18 * s, top - 0.53 * s]
        ],
        0.05
      ),
      bulbY: top - 0.54 * s,
      rudder: fin(
        [
          [stern + 0.32, top + 0.03],
          [stern + 0.2, top + 0.03],
          [stern + 0.19, top - 0.33 * s],
          [stern + 0.27, top - 0.34 * s]
        ],
        0.03
      ),
      bulb: new CapsuleGeometry(0.048, 0.3 * s, 6, 12)
    }
  }, [L, lay.hull.depth, stern])
  const sail = k.sail(p.sail, p.sailPattern, p.accent)
  return (
    <group>
      <mesh material={metal(k.steel)} position={[m.x, m.foot + m.h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.026, m.h, 10]} />
      </mesh>
      {has('top:rigging') && (
        <>
          <Rod a={[m.x, spreader, sw]} b={[m.x, spreader, -sw]} r={0.007} material={metal(k.steel)} />
          {([1, -1] as const).map((side) => (
            <group key={side}>
              <Rod
                a={[m.x, m.foot + m.h - 0.04, 0]}
                b={[m.x, spreader, side * sw]}
                r={0.0035}
                material={metal(k.chrome)}
              />
              <Rod
                a={[m.x, spreader, side * sw]}
                b={[m.x - 0.04, at(m.x).y, side * (at(m.x).hb - 0.02)]}
                r={0.0035}
                material={metal(k.chrome)}
              />
            </group>
          ))}
          <Rod a={tack} b={hounds} r={0.004} material={metal(k.chrome)} />
          <Rod
            a={[stern + 0.04, at(stern + 0.04).y + 0.02, 0]}
            b={[m.x, m.foot + m.h - 0.02, 0]}
            r={0.0035}
            material={metal(k.chrome)}
          />
        </>
      )}
      {has('top:boom') && (
        <group ref={boomRef} position={[m.x, m.foot + m.boomY, 0]}>
          <mesh material={k.varnish} position={[-m.boomLen / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.018, 0.016, m.boomLen, 8]} />
          </mesh>
          {sails && (
            <>
              <group ref={mainRef} position={[-0.02, 0.03, 0]}>
                <mesh geometry={main} material={sail} castShadow />
              </group>
              <group ref={coverRef} visible={false}>
                <mesh
                  material={k.cushion(p.accent)}
                  position={[-m.boomLen * 0.45, 0.05, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  castShadow
                >
                  <capsuleGeometry args={[0.045, m.boomLen * 0.75, 6, 12]} />
                </mesh>
              </group>
            </>
          )}
        </group>
      )}
      {sails && (
        <group position={tack} rotation={[0, 0, jibAngle]}>
          <group ref={jibRef}>
            <mesh geometry={jib} material={sail} position={[-0.01, 0.04, 0]} castShadow />
          </group>
        </group>
      )}
      <Wet geometry={keel.fin} material={painted(p.bottom)} />
      <Wet geometry={keel.bulb} material={k.rubber} position={[0, keel.bulbY, 0]} rotation={[0, 0, Math.PI / 2]} />
      <Wet geometry={keel.rudder} material={painted(p.bottom)} />
    </group>
  )
}

// ─── identity ───────────────────────────────────────────────────────────────────

function Identity({ lay, p, k, painted, metal, rig, name }: Paints & { rig: Rig; name?: string }) {
  const { has, at, spots, length: L } = lay
  void rig
  return (
    <group>
      {has('decor:ensign') && <Flag at={spots.ensign} colour={p.accent} size={lay.spec.mounts.ensign.size} />}
      {has('decor:pennant') && spots.masthead && <Burgee at={spots.masthead} colour={p.accent} trim={p.trim} />}
      {has('decor:pennant-line') && has('top:rigging') && spots.lines && <Dressing lines={spots.lines} kind="flags" />}
      {has('decor:string-lights') && spots.lines && <Dressing lines={spots.lines} kind="lights" />}
      {has('decor:nameplate') && <Nameplate name={name ?? ''} spot={spots.nameplate} trim={p.trim} />}
      {has('decor:buoys') &&
        [-0.05, -0.2, -0.35].map((f, i) => {
          const x = f * L
          return (
            <Buoy
              key={f}
              at={[x, at(x).y - 0.04, at(x).hb + 0.03]}
              a={i % 2 ? p.accent : p.trim}
              b={i % 2 ? p.trim : p.accent}
            />
          )
        })}
      {has('decor:lifering') && (
        <group position={spots.lifering.at} rotation={[0, spots.lifering.turn, 0]}>
          <LifeRing r={0.055} accent={p.accent} />
        </group>
      )}
      {has('decor:bell') && (
        <group position={[lay.crew.at[0] + 0.1, lay.crew.at[1], lay.crew.at[2] + 0.16]}>
          <Rod a={[0, 0, 0]} b={[0, 0.2, 0]} r={0.01} material={k.varnish} />
          <mesh material={k.bronze} position={[0.03, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.035, 0.05, 14, 1, true]} />
          </mesh>
        </group>
      )}
      {has('decor:wreath') && (
        <group position={spots.bow} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={enamel('#2f5a35', 'satin')} castShadow>
            <torusGeometry args={[0.07, 0.022, 8, 20]} />
          </mesh>
          <mesh material={painted('#b3242b')} position={[0, -0.07, 0.02]}>
            <boxGeometry args={[0.05, 0.03, 0.01]} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** The member's name in gold on a varnished board, on both bows */
function Nameplate({ name, spot, trim }: { name: string; spot: ModularLayout['spots']['nameplate']; trim: string }) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const g = canvas.getContext('2d')!
    g.fillStyle = '#9a5a2a'
    g.fillRect(0, 0, 512, 128)
    g.strokeStyle = '#e8c46a'
    g.lineWidth = 8
    g.strokeRect(8, 8, 496, 112)
    g.fillStyle = '#f4d47c'
    g.font = 'bold 64px Georgia, serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText((name || 'Navigator').slice(0, 14), 256, 68)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    return new MeshStandardMaterial({ map: tex, roughness: 0.45 })
  }, [name])
  void trim
  return (
    <>
      {([1, -1] as const).map((side) => (
        <mesh
          key={side}
          material={material}
          position={[spot.x, spot.y, side * (spot.hb + 0.006)]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <planeGeometry args={[0.28, 0.07]} />
        </mesh>
      ))}
    </>
  )
}

/** A brass hurricane lantern on a short post; its flame flickers */
function Lantern({ at, metal }: { at: Vec3; metal: Material }) {
  const flame = useMemo(
    () => new MeshStandardMaterial({ color: '#ffcf7a', emissive: '#ffb347', emissiveIntensity: 1.6 }),
    []
  )
  // the frame loop reaches the material through a ref
  const flameRef = useRef(flame)
  useEffect(() => {
    flameRef.current = flame
  }, [flame])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    flameRef.current.emissiveIntensity = 1.3 + Math.sin(t * 13) * 0.25 + Math.sin(t * 7.3) * 0.2
  })
  return (
    <group position={at}>
      <Rod a={[0, -0.04, 0]} b={[0, 0.1, 0]} r={0.007} material={metal} />
      <group position={[0, 0.14, 0]}>
        <mesh material={metal} position={[0, -0.035, 0]}>
          <cylinderGeometry args={[0.03, 0.032, 0.012, 12]} />
        </mesh>
        <mesh material={flame}>
          <cylinderGeometry args={[0.022, 0.022, 0.055, 12]} />
        </mesh>
        <mesh material={metal} position={[0, 0.038, 0]}>
          <coneGeometry args={[0.03, 0.03, 12]} />
        </mesh>
      </group>
    </group>
  )
}

const SIGNAL = ['#c8312b', '#f2c335', '#1f4f9c', '#f4f1e8', '#1e7a46', '#e8712a']

/** Pennants or warm bulbs strung along lines; pennants flutter, bulbs twinkle */
function Dressing({ lines, kind }: { lines: [Vec3, Vec3][]; kind: 'flags' | 'lights' }) {
  const points = useMemo(
    () =>
      lines.flatMap(([a, b]) => {
        const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.14))
        return Array.from({ length: n - 1 }, (_, i) => {
          const t = (i + 1) / n
          return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 0.03,
            a[2] + (b[2] - a[2]) * t
          ] as Vec3
        })
      }),
    [lines]
  )
  const bulbs = useMemo(
    () => [0, 1].map(() => new MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffbe55', emissiveIntensity: 1.4 })),
    []
  )
  const flags = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0.07, 0, 0, 0.035, -0.07, 0]), 3))
    g.computeVertexNormals()
    return g
  }, [])
  const wave = useRef<Group>(null)
  // the frame loop reaches the bulbs through a ref
  const bulbsRef = useRef(bulbs)
  useEffect(() => {
    bulbsRef.current = bulbs
  }, [bulbs])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const lit = bulbsRef.current
    lit[0].emissiveIntensity = 1.1 + Math.sin(t * 2.1) * 0.5
    lit[1].emissiveIntensity = 1.1 + Math.sin(t * 2.1 + Math.PI) * 0.5
    if (wave.current) wave.current.children.forEach((c, i) => (c.rotation.y = Math.sin(t * 6 + i) * 0.35))
  })
  if (kind === 'lights')
    return (
      <>
        {points.map((p, i) => (
          <mesh key={i} material={bulbs[i % 2]} position={p}>
            <sphereGeometry args={[0.014, 8, 6]} />
          </mesh>
        ))}
      </>
    )
  return (
    <group ref={wave}>
      {points.map((p, i) => (
        <mesh key={i} geometry={flags} material={kit().flag(SIGNAL[i % SIGNAL.length])} position={p} />
      ))}
    </group>
  )
}

// ─── the stern: an inboard below, a swim platform, and a water slide ─────────────

function Stern({ lay, p, k, painted, metal, wood, rig }: Paints & { rig: Rig }) {
  const { has, at, stern, length: L, platform, flybridge } = lay
  const bottom = painted(p.bottom)
  const inboard = useMemo(() => {
    if (!has('engine:inboard')) return null
    const st = hullStations(lay.hull)
    const under = (x: number) => -st.keel(Math.min(1, Math.max(0, x / L + 0.5))) + 0.03
    const depth = under(stern + 0.16) - 0.12
    return {
      rudder: fin(
        [
          [stern + 0.1, depth + 0.16],
          [stern + 0.02, depth + 0.16],
          [stern + 0.02, depth + 0.02],
          [stern + 0.1, depth + 0.02]
        ],
        0.025
      ),
      shaftY: depth + 0.08
    }
  }, [has, lay.hull, L, stern])
  const slide = useMemo(() => {
    if (!has('fun:slide') || !flybridge || !platform) return null
    // from the flybridge's aft corner, out over the starboard quarter and round, down into the sea beside the platform
    const fx = flybridge.x - flybridge.len / 2 + 0.05
    const fz = -(flybridge.w / 2 - 0.05)
    const top = flybridge.y + 0.12
    const curve = new CatmullRomCurve3(
      [
        [fx, top, fz],
        [fx - 0.08, top - 0.08, fz - 0.16],
        [fx + 0.06, top - 0.26, fz - 0.3],
        [fx - 0.1, top - 0.44, fz - 0.34],
        [stern + 0.02, 0.12, -(platform.w / 2 + 0.16)],
        [stern - 0.2, -0.03, -(platform.w / 2 + 0.14)]
      ].map(([x, y, z]) => new Vector3(x, y, z))
    )
    return { tube: new TubeGeometry(curve, 64, 0.03, 10, false), top: [fx, top, fz] as Vec3 }
  }, [has, flybridge, platform, stern])
  const stack = lay.canopy?.kind === 'wheelhouse' ? lay.canopy : null
  return (
    <group>
      {inboard && (
        <>
          <Wet geometry={inboard.rudder} material={bottom} />
          <Rod
            a={[stern + 0.2, inboard.shaftY, 0]}
            b={[stern + 0.13, inboard.shaftY, 0]}
            r={0.01}
            material={metal(k.steel)}
          />
          <Propeller at={[stern + 0.12, inboard.shaftY, 0]} r={0.065} blades={4} spin={rig} />
          {stack ? (
            <mesh
              material={k.rubber}
              position={[stack.x - stack.len / 2 + 0.03, stack.y + 0.12, -stack.w / 2 + 0.04]}
              castShadow
            >
              <cylinderGeometry args={[0.028, 0.028, 0.3, 10]} />
            </mesh>
          ) : (
            <mesh
              material={k.rubber}
              position={[stern + 0.12, at(stern + 0.12).y + 0.08, -at(stern + 0.12).hb + 0.08]}
              castShadow
            >
              <cylinderGeometry args={[0.022, 0.022, 0.2, 10]} />
            </mesh>
          )}
        </>
      )}
      {platform && (
        <group position={[platform.x, platform.y, 0]}>
          <RoundedBox
            args={[platform.len, 0.03, platform.w]}
            radius={0.01}
            smoothness={2}
            material={wood}
            castShadow
            receiveShadow
          />
          {[platform.w * 0.32, -platform.w * 0.32].map((z) => (
            <mesh key={z} material={metal(k.steel)} position={[platform.len / 2 - 0.02, 0.0, z]}>
              <boxGeometry args={[0.06, 0.05, 0.02]} />
            </mesh>
          ))}
        </group>
      )}
      {slide && (
        <>
          <mesh geometry={slide.tube} material={painted(p.accent)} castShadow />
          <Rod
            a={[slide.top[0], lay.flybridge!.y, slide.top[2]]}
            b={[slide.top[0], slide.top[1] + 0.05, slide.top[2]]}
            r={0.008}
            material={metal(k.chrome)}
          />
        </>
      )}
    </group>
  )
}

/** A roof over the flybridge on four posts: the third level */
function SkyRoof({ lay, p, k, painted, metal }: Paints) {
  const r = lay.skyRoof!
  const u = lay.flybridge!
  const corners: [number, number][] = [
    [r.x - r.len / 2 + 0.05, r.w / 2 - 0.05],
    [r.x + r.len / 2 - 0.05, r.w / 2 - 0.05]
  ]
  return (
    <group>
      {corners.flatMap(([x, z]) =>
        ([1, -1] as const).map((side) => (
          <Rod key={`${x}${side}`} a={[x, u.y, side * z]} b={[x, r.y, side * z]} r={0.012} material={metal(k.white)} />
        ))
      )}
      <RoundedBox
        args={[r.len, r.h, r.w]}
        radius={0.015}
        smoothness={2}
        material={painted(p.roof)}
        position={[r.x, r.y + r.h / 2, 0]}
        castShadow
      />
    </group>
  )
}

// ─── accessories that take room on deck, each in the spot its zone packed it into ─

function Zoned(ps: Paints) {
  const { lay, p } = ps
  const placements = useMemo(() => allocate(p.stage, p.chosen).placements, [p.stage, p.chosen])
  return (
    <group>
      {Object.entries(placements).map(([id, pl]) => {
        const zone = lay.zones[pl.zone]
        if (!zone) return null
        const at = pl.lane === null ? zone.span(pl.row, pl.rows) : zone.cell(pl.row, pl.lane)
        return <ZonedItem key={id} id={id} at={at} zone={zone} pl={pl} {...ps} />
      })}
    </group>
  )
}

function ZonedItem({
  id,
  at,
  zone,
  pl,
  lay,
  p,
  k,
  painted,
  metal
}: Paints & { id: string; at: Vec3; zone: Zone; pl: Placement }) {
  const length = zone.rowLen * pl.rows
  switch (id) {
    case 'deck:crate':
      return (
        <group position={at} rotation={[0, 0.25, 0]}>
          <RoundedBox
            args={[0.13, 0.08, 0.1]}
            radius={0.006}
            smoothness={1}
            material={enamel('#b38a57', 'matte')}
            position={[0, 0.04, 0]}
            castShadow
          />
          {[-0.03, 0.03].map((y) => (
            <mesh key={y} material={enamel('#8b6740', 'matte')} position={[0, 0.04 + y, 0]}>
              <boxGeometry args={[0.132, 0.012, 0.102]} />
            </mesh>
          ))}
        </group>
      )
    case 'deck:tackle':
      return (
        <group position={at} rotation={[0, -0.3, 0]}>
          <RoundedBox
            args={[0.1, 0.05, 0.06]}
            radius={0.01}
            smoothness={2}
            material={enamel('#3f8f5e')}
            position={[0, 0.025, 0]}
            castShadow
          />
          <Rod a={[-0.03, 0.05, 0]} b={[0.03, 0.05, 0]} r={0.004} material={k.rubber} />
        </group>
      )
    case 'engine:fuel-tank':
      return (
        <group position={at}>
          <RoundedBox
            args={[0.15, 0.08, 0.1]}
            radius={0.02}
            smoothness={2}
            material={painted(p.equipment ?? '#c8312b')}
            position={[0, 0.04, 0]}
            castShadow
          />
          <mesh material={k.rubber} position={[0.05, 0.09, 0.02]}>
            <cylinderGeometry args={[0.012, 0.012, 0.015, 8]} />
          </mesh>
        </group>
      )
    case 'decor:traps':
      return (
        <group position={at} scale={0.85}>
          <Trap at={[0.02, 0.075, 0]} turn={Math.PI / 2 + 0.1} />
          <Trap at={[0, 0.205, -0.01]} turn={Math.PI / 2 - 0.12} />
        </group>
      )
    case 'decor:lantern':
      return <Lantern at={at} metal={metal(k.bronze)} />
    case 'deck:ladder':
      return (
        <group position={[Math.min(at[0], lay.stern) - 0.02, at[1], at[2]]}>
          {[0.05, -0.05].map((z) => (
            <Rod key={z} a={[0.02, 0.04, z]} b={[-0.05, -0.32, z]} r={0.006} material={metal(k.chrome)} />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <Rod
              key={f}
              a={[0.02 - 0.07 * f, 0.04 - 0.36 * f, 0.05]}
              b={[0.02 - 0.07 * f, 0.04 - 0.36 * f, -0.05]}
              r={0.005}
              material={metal(k.chrome)}
            />
          ))}
        </group>
      )
    case 'deck:anchor-rope':
      return (
        <mesh material={k.rope} position={[at[0], at[1] + 0.015, at[2]]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.05, 0.016, 8, 18]} />
        </mesh>
      )
    case 'deck:radar':
      return <Radar at={at} metal={metal(k.white)} />
    case 'decor:chest':
      return (
        <group position={at} rotation={[0, 0.3, 0]}>
          <RoundedBox
            args={[0.14, 0.08, 0.1]}
            radius={0.01}
            smoothness={2}
            material={k.varnish}
            position={[0, 0.04, 0]}
            castShadow
          />
          {[-0.045, 0.045].map((x) => (
            <mesh key={x} material={metal(k.bronze)} position={[x, 0.06, 0]}>
              <boxGeometry args={[0.012, 0.1, 0.104]} />
            </mesh>
          ))}
        </group>
      )
    case 'fun:grill':
      return <Grill at={at} />
    case 'fun:palms':
      return <Palm at={at} />
    case 'fun:loungers':
      return (
        <Loungers
          at={at}
          length={length}
          width={zone.width}
          towel={p.accent}
          frame={p.deck ? painted(p.deck) : k.varnish}
          cushion={k.cushion(p.seats)}
        />
      )
    case 'fun:hot-tub':
      return <HotTub at={at} d={Math.min(length, zone.width) * 0.86} shell={k.white} />
    case 'fun:pool':
      return <Pool at={at} length={length * 0.94} width={zone.width * 0.9} rim={k.white} metal={metal(k.chrome)} />
    case 'fun:jet-ski':
      return <JetSki at={at} paint={painted(p.accent)} />
    case 'fun:garden':
      return <Garden at={at} length={length} width={zone.width} planter={k.varnish} />
    default:
      return null
  }
}

const WATER = () =>
  new MeshStandardMaterial({
    color: '#56d4ee',
    emissive: '#1d9fc0',
    emissiveIntensity: 0.35,
    roughness: 0.15,
    transparent: true,
    opacity: 0.88
  })

/** A round hot tub with bubbling water */
function HotTub({ at, d, shell }: { at: Vec3; d: number; shell: Material }) {
  const water = useMemo(() => WATER(), [])
  const bubbles = useRef<Group>(null)
  useFrame(({ clock }) => {
    bubbles.current?.children.forEach((b, i) => {
      const t = (clock.elapsedTime * 0.8 + i * 0.37) % 1
      b.position.y = 0.085 + t * 0.03
      b.scale.setScalar(1 - t * 0.7)
    })
  })
  const r = d / 2
  return (
    <group position={at}>
      <mesh material={shell} position={[0, 0.045, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 1.04, 0.09, 24]} />
      </mesh>
      <mesh material={water} position={[0, 0.087, 0]}>
        <cylinderGeometry args={[r * 0.86, r * 0.86, 0.008, 24]} />
      </mesh>
      <group ref={bubbles}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2
          const rr = r * 0.6 * ((i % 3) / 3 + 0.25)
          return (
            <mesh key={i} material={shell} position={[Math.cos(a) * rr, 0.09, Math.sin(a) * rr]}>
              <sphereGeometry args={[0.012, 6, 5]} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** A swimming pool set into the aft deck, with a chrome ladder */
function Pool({
  at,
  length,
  width,
  rim,
  metal
}: {
  at: Vec3
  length: number
  width: number
  rim: Material
  metal: Material
}) {
  const water = useMemo(() => WATER(), [])
  const t = 0.035
  return (
    <group position={at}>
      {[
        [0, width / 2 - t / 2, length, t],
        [0, -width / 2 + t / 2, length, t],
        [length / 2 - t / 2, 0, t, width],
        [-length / 2 + t / 2, 0, t, width]
      ].map(([x, z, l, w], i) => (
        <mesh key={i} material={rim} position={[x, 0.035, z]} castShadow receiveShadow>
          <boxGeometry args={[l, 0.07, w]} />
        </mesh>
      ))}
      <mesh material={water} position={[0, 0.055, 0]}>
        <boxGeometry args={[length - t * 2, 0.012, width - t * 2]} />
      </mesh>
      {[0.04, -0.04].map((z) => (
        <Rail
          key={z}
          points={[
            [length / 2 - 0.05, 0.02, z],
            [length / 2 - 0.03, 0.12, z],
            [length / 2 - 0.09, 0.14, z]
          ]}
          r={0.005}
          material={metal}
        />
      ))}
    </group>
  )
}

/** Two sun loungers side by side, each with a beach towel */
function Loungers({
  at,
  length,
  width,
  towel,
  frame,
  cushion
}: {
  at: Vec3
  length: number
  width: number
  towel: string
  frame: Material
  cushion: Material
}) {
  const l = Math.min(length * 0.9, 0.3)
  return (
    <group position={at}>
      {[width * 0.24, -width * 0.24].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh material={frame} position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[l, 0.02, 0.1]} />
          </mesh>
          <mesh material={cushion} position={[0.02, 0.05, 0]} castShadow>
            <boxGeometry args={[l * 0.7, 0.02, 0.09]} />
          </mesh>
          <mesh material={cushion} position={[-l / 2 + 0.03, 0.08, 0]} rotation={[0, 0, -0.9]} castShadow>
            <boxGeometry args={[0.1, 0.02, 0.09]} />
          </mesh>
          <mesh material={enamel(towel, 'matte')} position={[0.04, 0.062, 0]}>
            <boxGeometry args={[l * 0.45, 0.006, 0.07]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A kettle grill on three legs, coals glowing */
function Grill({ at }: { at: Vec3 }) {
  const coals = useMemo(
    () => new MeshStandardMaterial({ color: '#ff7a2f', emissive: '#ff5a1a', emissiveIntensity: 1.4 }),
    []
  )
  // the frame loop reaches the material through a ref
  const coalsRef = useRef(coals)
  useEffect(() => {
    coalsRef.current = coals
  }, [coals])
  useFrame(({ clock }) => {
    coalsRef.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 3.1) * 0.3
  })
  const black = enamel('#222326', 'satin')
  return (
    <group position={at}>
      {[0, 2.1, 4.2].map((a) => (
        <Rod key={a} a={[Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03]} b={[0, 0.1, 0]} r={0.004} material={black} />
      ))}
      <mesh material={black} position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={coals} position={[0, 0.118, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.042, 14]} />
      </mesh>
      <mesh material={black} position={[-0.04, 0.16, 0]} rotation={[0, 0, 1.1]} castShadow>
        <sphereGeometry args={[0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}

/** A little palm in a terracotta pot */
function Palm({ at }: { at: Vec3 }) {
  const trunk = enamel('#8a6a45', 'matte')
  const frond = enamel('#3f9a4a', 'satin')
  return (
    <group position={at}>
      <mesh material={enamel('#c46a3c', 'matte')} position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.07, 12]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          material={trunk}
          position={[i * 0.006, 0.1 + i * 0.06, 0]}
          rotation={[0, 0, -0.08 * i]}
          castShadow
        >
          <cylinderGeometry args={[0.011 - i * 0.002, 0.013 - i * 0.002, 0.065, 8]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <group key={i} position={[0.015, 0.25, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
          <mesh material={frond} position={[0.06, -0.015, 0]} rotation={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[0.13, 0.004, 0.035]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A jet ski on the swim platform, in the member's accent colour */
function JetSki({ at, paint }: { at: Vec3; paint: Material }) {
  const k = kit()
  return (
    <group position={at} rotation={[0, 0.12, 0]}>
      <RoundedBox
        args={[0.3, 0.06, 0.12]}
        radius={0.025}
        smoothness={3}
        material={paint}
        position={[0, 0.04, 0]}
        castShadow
      />
      <mesh material={paint} position={[0.17, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.05, 0.08, 12]} />
      </mesh>
      <RoundedBox
        args={[0.13, 0.035, 0.07]}
        radius={0.015}
        smoothness={2}
        material={k.rubber}
        position={[-0.03, 0.085, 0]}
        castShadow
      />
      <Rod a={[0.06, 0.07, 0]} b={[0.08, 0.13, 0]} r={0.006} material={k.rubber} />
      <Rod a={[0.08, 0.13, 0.05]} b={[0.08, 0.13, -0.05]} r={0.006} material={k.chrome} />
    </group>
  )
}

/** Planters along the roof, with bushes, flowers and a little tree */
function Garden({ at, length, width, planter }: { at: Vec3; length: number; width: number; planter: Material }) {
  const greens = ['#3f8f4a', '#4fa45a', '#2f7a3e'].map((c) => enamel(c, 'satin'))
  const flowers = ['#f2709c', '#f7d35a', '#ffffff', '#b67ae8'].map((c) => enamel(c, 'satin'))
  const l = Math.max(length * 0.9, 0.24)
  return (
    <group position={at}>
      {[width * 0.26, -width * 0.26].map((z, side) => (
        <group key={z} position={[0, 0, z]}>
          <RoundedBox
            args={[l, 0.05, 0.1]}
            radius={0.01}
            smoothness={2}
            material={planter}
            position={[0, 0.025, 0]}
            castShadow
          />
          {[-0.36, -0.12, 0.12, 0.36].map((f, i) => (
            <group key={f} position={[f * l, 0.06, 0]}>
              <mesh material={greens[(i + side) % 3]} castShadow>
                <sphereGeometry args={[0.038, 10, 8]} />
              </mesh>
              {[0, 1, 2].map((j) => (
                <mesh
                  key={j}
                  material={flowers[(i + j + side) % 4]}
                  position={[Math.cos(j * 2.1) * 0.03, 0.025, Math.sin(j * 2.1) * 0.03]}
                >
                  <sphereGeometry args={[0.009, 6, 5]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      <Rod a={[0, 0, 0]} b={[0, 0.16, 0]} r={0.01} material={enamel('#8a6a45', 'matte')} />
      <mesh material={greens[1]} position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.07, 12, 10]} />
      </mesh>
    </group>
  )
}
