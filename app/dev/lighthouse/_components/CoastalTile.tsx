'use client'

import { useFrame } from '@react-three/fiber'
import { ReactNode, useMemo } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  FrontSide,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Texture
} from 'three'
import { materials, PALETTE } from '../_lib/materials'
import { beachHeight, bakeShoreTexture, ShoreField } from '../_lib/shore'
import { ALL_SIDES, SEA_DEPTH, TILE_SIZE, TileSides, WATER_Y } from '../_lib/world'
import { smoothstep } from '../_lib/noise'

// One square terrain tile: a block of sea with its beach, and whatever stands on it as children. Waves are computed
// in world space so neighbouring tiles line up; the cutaway glass sides only appear on sides with no neighbour.

const SIMPLEX = /* glsl */ `
vec3 permute3(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float ripples(vec2 p, float t) {
  return snoise(p * 0.9 + vec2(t * 0.11, t * 0.07)) * 0.6
       + snoise(p * 2.3 - vec2(t * 0.17, -t * 0.13)) * 0.3
       + snoise(p * 5.1 + vec2(-t * 0.23, t * 0.19)) * 0.12;
}
`

type Uniform<T> = { value: T }
const time: Uniform<number> = { value: 0 }

function waterSurfaceMaterial(shore: Texture) {
  const mat = new MeshStandardMaterial({ roughness: 0.12, metalness: 0, color: '#ffffff' })
  const uniforms = {
    uTime: time,
    uShore: { value: shore },
    uDeep: { value: new Color('#1f9aae') },
    uMid: { value: new Color('#3dbac0') },
    uShallow: { value: new Color('#8fe0d4') }
  }
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec2 vLocal;
        varying vec2 vWorld;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLocal = position.xz;
        vWorld = (modelMatrix * vec4(position, 1.0)).xz;
        transformed.y += sin(vWorld.x * 1.3 + uTime * 0.9) * cos(vWorld.y * 1.1 - uTime * 0.7) * 0.018;`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform sampler2D uShore;
        uniform vec3 uDeep, uMid, uShallow;
        varying vec2 vLocal;
        varying vec2 vWorld;
        ${SIMPLEX}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float d = texture2D(uShore, vLocal / ${TILE_SIZE.toFixed(1)} + 0.5).r * 2.0;
        vec3 water = mix(uShallow, uMid, smoothstep(0.0, 0.7, d));
        water = mix(water, uDeep, smoothstep(0.6, 2.0, d));
        water += 0.035 * snoise(vWorld * 0.6 + uTime * 0.03);

        // foam hugging the sand, broken up, and a soft swash line that runs up the beach and fades
        float wob = snoise(vWorld * 3.2 + vec2(uTime * 0.25, -uTime * 0.2));
        float foamEdge = 1.0 - smoothstep(0.02, 0.13 + 0.05 * wob, d);
        float phase = fract(uTime * 0.11);
        float swashD = 0.06 + 0.42 * (1.0 - phase);
        float swash = (1.0 - smoothstep(0.0, 0.035 + 0.02 * wob, abs(d - swashD)))
                    * smoothstep(0.0, 0.25, phase) * (1.0 - smoothstep(0.75, 1.0, phase))
                    * smoothstep(-0.3, 0.5, snoise(vWorld * 2.0 + vec2(0.0, uTime * 0.05)));
        float lace = smoothstep(0.55, 0.9, snoise(vWorld * 7.0 + uTime * 0.3)) * (1.0 - smoothstep(0.1, 0.45, d));
        float foam = clamp(foamEdge * 0.95 + swash * 0.7 + lace * 0.35, 0.0, 1.0);
        diffuseColor.rgb = mix(water, vec3(0.97, 0.99, 0.98), foam);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 e = vec2(0.04, 0.0);
        float h0 = ripples(vWorld, uTime);
        vec2 grad = vec2(ripples(vWorld + e.xy, uTime) - h0, ripples(vWorld + e.yx, uTime) - h0) / e.x;
        float calm = 0.18 * (1.0 - foam * 0.8);
        normal = normalize(normal - (viewMatrix * vec4(grad.x * calm, 0.0, grad.y * calm, 0.0)).xyz);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += foam * vec3(0.18) + water * 0.08;`
      )
  }
  return mat
}

/** The glass-cut sides of the sea block: deep teal below, glowing turquoise near the surface */
function waterSideMaterial() {
  return new ShaderMaterial({
    transparent: true,
    side: FrontSide,
    uniforms: {
      uTime: time,
      uTop: { value: new Color('#5fd0cf') },
      uMid: { value: new Color('#2a9aa9') },
      uBottom: { value: new Color('#11586a') },
      uDepth: { value: SEA_DEPTH }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vY;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vY = position.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDepth;
      uniform vec3 uTop, uMid, uBottom;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vY;
      ${SIMPLEX}
      void main() {
        float t = clamp(vY / uDepth + 1.0, 0.0, 1.0); // 0 at the floor, 1 at the surface
        float along = dot(vWorld.xz, vec2(-vNormalW.z, vNormalW.x));
        vec3 col = mix(uBottom, uMid, smoothstep(0.0, 0.8, t));
        col = mix(col, uTop, smoothstep(0.72, 1.0, t));
        // caustic light drifting through the water
        float c = snoise(vec2(along * 0.9, vY * 2.2) + vec2(uTime * 0.05, uTime * 0.03));
        float streak = snoise(vec2(along * 0.35, vY * 8.0 + uTime * 0.02));
        col += 0.05 * c * t + 0.025 * streak;
        // bright meniscus at the surface and a thin glowing seam at the floor
        col += 0.45 * smoothstep(0.97, 1.0, t) + 0.12 * (1.0 - smoothstep(0.0, 0.03, t));
        // the face turned toward the key light is a touch brighter
        col *= 0.82 + 0.25 * max(dot(vNormalW, normalize(vec3(-0.6, 0.0, 0.8))), 0.0);
        gl_FragColor = vec4(col, mix(0.86, 0.94, 1.0 - t));
        #include <colorspace_fragment>
      }`
  })
}

const hidden = new MeshBasicMaterial({ visible: false })

export function CoastalTile({
  position = [0, WATER_Y, 0],
  shore,
  sides = ALL_SIDES,
  children
}: {
  position?: [number, number, number]
  shore: ShoreField
  sides?: TileSides
  children?: ReactNode
}) {
  const shoreTex = useMemo(() => bakeShoreTexture(shore), [shore])
  const surfaceMat = useMemo(() => waterSurfaceMaterial(shoreTex), [shoreTex])

  const water = useMemo(() => {
    const g = new PlaneGeometry(TILE_SIZE, TILE_SIZE, 160, 160)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const beach = useMemo(() => {
    const g = new PlaneGeometry(TILE_SIZE - 0.04, TILE_SIZE - 0.04, 220, 220)
    g.rotateX(-Math.PI / 2)
    const pos = g.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)
    const dry = new Color(PALETTE.sand)
    const wet = new Color(PALETTE.wetSand)
    const deep = new Color('#9d8a63')
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = beachHeight(shore, x, z)
      pos.setY(i, y)
      c.copy(dry)
        .lerp(wet, 1 - smoothstep(0.03, 0.14, y))
        .lerp(deep, 1 - smoothstep(-0.3, 0.0, y))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.computeVertexNormals()
    // world-scale sand grain
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4)
    return g
  }, [shore])

  const block = useMemo(() => {
    const g = new BoxGeometry(TILE_SIZE, SEA_DEPTH, TILE_SIZE)
    g.translate(0, -SEA_DEPTH / 2 + 0.012, 0)
    return g
  }, [])
  const blockMats = useMemo<Material[]>(() => {
    const side = waterSideMaterial()
    const floor = new MeshBasicMaterial({ color: '#0d3d4a' })
    // BoxGeometry face order: +x (east), -x (west), +y, -y, +z (south), -z (north)
    return [
      sides.east ? side : hidden,
      sides.west ? side : hidden,
      hidden,
      floor,
      sides.south ? side : hidden,
      sides.north ? side : hidden
    ]
  }, [sides])

  useFrame((_, dt) => {
    time.value += Math.min(dt, 0.1)
  })

  return (
    <group position={position}>
      <mesh geometry={block} material={blockMats} renderOrder={2} />
      <mesh geometry={water} material={surfaceMat} receiveShadow />
      <mesh geometry={beach} material={materials().sand} receiveShadow castShadow />
      {children}
    </group>
  )
}
