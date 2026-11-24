'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  ShaderMaterial,
  SpriteMaterial,
  TorusGeometry
} from 'three'

// A miniature Fresnel lens assembly for a lantern room: a fixed brass pedestal, and on it a turning platform that
// carries the lens (a drum of glass ridges in a brass cage, with a bullseye panel either side), the warm bulb inside
// and the two beams. The beams leave from the bullseyes, so lens and light turn as one; a hotspot inside the glass,
// a halo outside it and the glazing's own glow (lanternGlazing) follow the lens round. Local origin is the lantern
// floor; everything fits inside a lantern of radius ~1.05.

/** Turns per second */
const TURN = 0.14

/**
 * The lens's heading (radians round the vertical, as the turning group's rotation.y), shared with the lantern glazing
 * so the panes the lens faces light up as it passes them.
 */
const beamHeading = { value: 0 }

let glazingMaterial: MeshStandardMaterial | null = null
/**
 * The lantern room's glass: lightly tinted and mostly clear, warmed a little all round by the lamp inside, and glowing
 * strongly on the two sides the lens is facing (in the lantern's own coordinates, centred on its axis). Built once.
 */
export function lanternGlazing() {
  if (glazingMaterial) return glazingMaterial
  const mat = new MeshStandardMaterial({
    color: '#9fc4c8',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: DoubleSide
  })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHeading = beamHeading
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRound;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRound = position.xz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHeading;\nvarying vec2 vRound;')
      .replace(
        '#include <opaque_fragment>',
        `{
          // the beam runs along the turning group's +x: (cos h, -sin h) on the ground
          vec2 beam = vec2(cos(uHeading), -sin(uHeading));
          float facing = abs(dot(normalize(vRound), beam));
          float hot = pow(facing, 10.0);
          vec3 warm = vec3(1.0, 0.72, 0.36);
          outgoingLight += warm * (0.08 + 1.9 * hot);
          diffuseColor.a = max(diffuseColor.a, 0.3 + 0.55 * hot);
        }
        #include <opaque_fragment>`
      )
  }
  return (glazingMaterial = mat)
}

/** A soft round glow for sprites: white at the middle fading to nothing */
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}
const LENS = { r: 0.5, h: 0.78, y: 0.66 }
const BEAM = { start: 0.26, end: 1.0, reach: 6 }

/** Shared by every lighthouse that has one: built once */
let kit: ReturnType<typeof buildKit> | null = null
function buildKit() {
  const brass = new MeshStandardMaterial({ color: '#c9973f', metalness: 0.75, roughness: 0.32 })
  const glass = new MeshStandardMaterial({
    color: '#ffcf73',
    emissive: new Color('#ffa83a'),
    emissiveIntensity: 0.9,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  })
  const bulb = new MeshStandardMaterial({ color: '#fff2cf', emissive: new Color('#ffcf7a'), emissiveIntensity: 2.4, toneMapped: false })

  // the beam: an open cone along +x from the lens face, brightest near the lens and fading to nothing along its length;
  // its sides fade where they turn edge-on to the eye, so it reads as a soft shaft of light, never a hard wedge
  const beamGeo = new CylinderGeometry(BEAM.end, BEAM.start, BEAM.reach, 20, 1, true)
  beamGeo.rotateZ(-Math.PI / 2)
  beamGeo.translate(LENS.r + BEAM.reach / 2, 0, 0)
  const beam = new ShaderMaterial({
    uniforms: { uColor: { value: new Color('#ffd58a') }, uStrength: { value: 0.7 } },
    vertexShader: `
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vAlong = clamp((position.x - ${LENS.r.toFixed(3)}) / ${BEAM.reach.toFixed(3)}, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float face = pow(abs(dot(normalize(vN), normalize(vView))), 1.6);
        float fall = smoothstep(0.0, 0.04, vAlong) * pow(1.0 - vAlong, 2.0);
        gl_FragColor = vec4(uColor * face * fall * uStrength, 1.0);
      }`,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false
  })

  // horizontal glass ridges round the drum, fattest at the middle like a real lens's prisms
  const ridges = Array.from({ length: 7 }, (_, i) => {
    const t = (i - 3) / 3
    return { y: LENS.y + t * LENS.h * 0.42, g: new TorusGeometry(LENS.r + 0.04 * (1 - t * t), 0.04, 6, 32) }
  })
  // a bullseye: concentric rings on the lens face, where each beam starts
  const bullseye = [0.08, 0.16, 0.24].map((r) => new TorusGeometry(r, 0.022, 6, 24))
  const glowMap = glowTexture()
  const glow = (color: string, opacity: number) =>
    new SpriteMaterial({ map: glowMap, color, opacity, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })
  // the hotspot just inside the glass where the lens points, and a faint halo spilling outside it
  const hotspot = glow('#ffd690', 0.95)
  const halo = glow('#ffb860', 0.35)
  return { brass, glass, bulb, beamGeo, beam, ridges, bullseye, hotspot, halo }
}

export function FresnelOptics() {
  const k = useMemo(() => (kit ??= buildKit()), [])
  const turn = useRef<Group>(null)
  useFrame((_, dt) => {
    if (!turn.current) return
    turn.current.rotation.y += Math.min(dt, 0.05) * TURN * Math.PI * 2
    beamHeading.value = turn.current.rotation.y
  })

  return (
    <group>
      {/* fixed pedestal */}
      <mesh material={k.brass} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.2, 16]} />
      </mesh>

      <group ref={turn}>
        {/* the turning platform: a brass table with a toothed rim */}
        <mesh material={k.brass} position={[0, 0.23, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.06, 32]} />
        </mesh>
        <mesh material={k.brass} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.03, 4, 24]} />
        </mesh>

        {/* the lens drum: ridged glass in a brass cage, with brass caps top and bottom */}
        <mesh material={k.glass} position={[0, LENS.y, 0]}>
          <cylinderGeometry args={[LENS.r, LENS.r, LENS.h, 24, 1, true]} />
        </mesh>
        {k.ridges.map((r, i) => (
          <mesh key={i} geometry={r.g} material={k.glass} position={[0, r.y, 0]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
        {[LENS.y - LENS.h / 2, LENS.y + LENS.h / 2].map((y, i) => (
          <mesh key={i} material={k.brass} position={[0, y, 0]}>
            <cylinderGeometry args={[LENS.r + 0.05, LENS.r + 0.05, 0.05, 24]} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4
          return (
            <mesh key={i} material={k.brass} position={[Math.cos(a) * (LENS.r + 0.03), LENS.y, Math.sin(a) * (LENS.r + 0.03)]}>
              <boxGeometry args={[0.03, LENS.h, 0.03]} />
            </mesh>
          )
        })}
        <mesh material={k.brass} position={[0, LENS.y + LENS.h / 2 + 0.07, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 0.1, 12]} />
        </mesh>

        {/* the bulb at the heart of the lens */}
        <mesh material={k.bulb} position={[0, LENS.y, 0]}>
          <sphereGeometry args={[0.13, 16, 12]} />
        </mesh>

        {/* a bullseye and a beam either side */}
        {[0, Math.PI].map((a) => (
          <group key={a} rotation={[0, a, 0]} position={[0, LENS.y, 0]}>
            {k.bullseye.map((g, i) => (
              <mesh key={i} geometry={g} material={k.glass} position={[LENS.r + 0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
            ))}
            <sprite material={k.hotspot} position={[0.88, 0, 0]} scale={[0.9, 0.9, 1]} renderOrder={3} />
            <sprite material={k.halo} position={[1.35, 0, 0]} scale={[1.9, 1.9, 1]} renderOrder={3} />
            <mesh geometry={k.beamGeo} material={k.beam} renderOrder={2} />
          </group>
        ))}
      </group>
    </group>
  )
}
