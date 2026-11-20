import { AddEquation, Color, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, DataTexture, LinearFilter, MeshStandardMaterial, RGBAFormat, UnsignedByteType } from 'three'
import { coastShore, seabed } from './coast'
import { SEA_LOOK, seaRefs, seaUniforms } from './seaLook'
import { SEA_CENTER, SEA_FADE, SEA_GLSL, SEA_LEVEL } from './waves'

// The sea surface for the whole coastal world: the lighthouse diorama's own water (its turquoise palette, fine
// glittering ripples, lace foam and swash) with the real depth under it deciding how transparent it is. Any scene that
// has a seabed baked with bakeSeabed() can drive it, and the swell is the shared one the boats ride.

export { SEA_LOOK }

/** The depth map covers the harbor at this resolution; outside it the water is simply deep */
export const MAP = { minX: -64, minZ: -70, size: 128, res: 1024, lo: -5, hi: 1 }

/** Height of the sea floor and distance from shore, baked into a texture (height encoded over [lo, hi]) */
export function bakeSeabed() {
  const { minX, minZ, size, res, lo, hi } = MAP
  const data = new Uint8Array(res * res * 4)
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) {
      const x = minX + ((i + 0.5) / res) * size
      const z = minZ + ((j + 0.5) / res) * size
      const d = coastShore(x, z)
      const h = seabed(x, z, d)
      const o = (j * res + i) * 4
      data[o] = Math.round(Math.min(1, Math.max(0, (h - lo) / (hi - lo))) * 255)
      data[o + 1] = Math.round(Math.min(1, Math.max(0, d / 4)) * 255)
      data[o + 2] = 0
      data[o + 3] = 255
    }
  const tex = new DataTexture(data, res, res, RGBAFormat, UnsignedByteType)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

export const NOISE = /* glsl */ `
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
// light focused through the surface: two drifting cell patterns, sharpened
float caustic(vec2 p, float t) {
  float a = snoise(p * 1.9 + vec2(t * 0.11, -t * 0.07));
  float b = snoise(p * 2.3 - vec2(t * 0.09, t * 0.13) + 7.0);
  float c = 1.0 - abs(a + b) * 0.5;
  return pow(clamp(c, 0.0, 1.0), 6.0);
}
`

const MAP_GLSL = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uMapMin;
uniform float uMapSize;
// sea-floor height and shore distance at a world point
vec2 floorAt(vec2 p) {
  vec2 uv = (p - uMapMin) / uMapSize;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec2 s = texture2D(uMap, clamp(uv, 0.0, 1.0)).rg;
  float h = mix(${MAP.lo.toFixed(1)}, ${MAP.hi.toFixed(1)}, s.r);
  return vec2(mix(${MAP.lo.toFixed(1)}, h, inside), mix(4.0, s.g * 4.0, inside));
}
float swellMask(float d) {
  return smoothstep(0.8, 3.5, d);
}
${SEA_GLSL}
`

export function seaSurfaceMaterial(map: DataTexture, time: { value: number }, px: { value: number }) {
  // premultiplied blending, so the sun's glints and the foam keep their full strength over see-through shallows
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.12, metalness: 0, transparent: true, depthWrite: false })
  mat.blending = CustomBlending
  mat.blendEquation = AddEquation
  mat.blendSrc = OneFactor
  mat.blendDst = OneMinusSrcAlphaFactor
  mat.blendSrcAlpha = OneFactor
  mat.blendDstAlpha = OneMinusSrcAlphaFactor
  seaRefs.water = mat
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, seaUniforms, {
      uTime: time,
      uPx: px,
      uMap: { value: map },
      uMapMin: { value: [MAP.minX, MAP.minZ] },
      uMapSize: { value: MAP.size },
      // the diorama's own water colours, with a glassier aqua right over the sand and ocean blue in the deep
      // the diorama's own three water colours, plus a glassier aqua over the sand and a touch more ocean far out
      uTurq: { value: new Color('#3dbac0') },
      uTealMix: { value: new Color('#2fb0b4') },
      uOcean: { value: new Color('#2a7fb0') },
      uSun: { value: new Color('#fff0d2') },
      uFoam: { value: new Color('#f6fffd') }
    })
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        ${MAP_GLSL}
        varying vec2 vWorld;
        varying vec3 vSea;
        varying float vDepth;
        varying float vShore;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec2 wp = (modelMatrix * vec4(position, 1.0)).xz;
        vec2 fl = floorAt(wp);
        float far = length(wp - vec2(${SEA_CENTER.x.toFixed(1)}, ${SEA_CENTER.z.toFixed(1)}));
        vec3 s = sea(wp, uTime, swellMask(fl.y) * (1.0 - smoothstep(${SEA_FADE[0].toFixed(1)}, ${SEA_FADE[1].toFixed(1)}, far)));
        transformed.y += s.x;
        vWorld = wp;
        vSea = s;
        vDepth = (${SEA_LEVEL.toFixed(3)} + s.x) - fl.x;
        vShore = fl.y;`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime, uPx, uWaveSpeed, uWaveHeight, uWaveFreq, uWaveDir, uTexture, uNormal, uReflect, uSparkle, uOpacity, uClarity, uFoamAmt;
        uniform vec3 uGlass, uShallow, uTurq, uBlue, uDeep, uTealMix, uOcean, uSun, uFoam;
        varying vec2 vWorld;
        varying vec3 vSea;
        varying float vDepth;
        varying float vShore;
        ${NOISE}
        // fine texture: stretched along the wind and streaming with it (streaks, not swirls); no warping
        float rip(vec2 p, float t) {
          vec2 d = vec2(cos(uWaveDir + 0.35), sin(uWaveDir + 0.35));
          vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
          q.x -= t * 0.9 * uWaveSpeed;
          return snoise(q * vec2(0.9, 2.1)) * 0.6 + snoise(q * vec2(2.2, 4.6) + vec2(-t * 0.5 * uWaveSpeed, 0.0)) * 0.3;
        }
        // one directional wave system: returns the surface slope. Travels at the deep-water speed for its wavelength.
        vec2 wave(vec2 p, float ang, float wl, float slope, float ph, float t) {
          vec2 d = vec2(cos(ang + uWaveDir), sin(ang + uWaveDir));
          float k = 6.2831853 / wl * uWaveFreq;
          float x = dot(d, p) * k - sqrt(9.8 * k) * 0.3 * uWaveSpeed * t + ph;
          return d * slope * cos(x);
        }`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // the diorama's ripples bend the swell's own slope; foam (computed below, needed here) calms them
        vec2 e = vec2(0.04, 0.0);
        float h0 = rip(vWorld, uTime);
        vec2 grad = vec2(rip(vWorld + e.xy, uTime) - h0, rip(vWorld + e.yx, uTime) - h0) / e.x;
        float wob = snoise(vWorld * 3.2 + vec2(uTime * 0.25, -uTime * 0.2));
        float shoreD = clamp(vShore, 0.0, 4.0);
        float foamEdge = 1.0 - smoothstep(0.02, 0.13 + 0.05 * wob, shoreD);
        float phase = fract(uTime * 0.11);
        float swash = (1.0 - smoothstep(0.0, 0.035 + 0.02 * wob, abs(shoreD - (0.06 + 0.42 * (1.0 - phase)))))
                    * smoothstep(0.0, 0.25, phase) * (1.0 - smoothstep(0.75, 1.0, phase))
                    * smoothstep(-0.3, 0.5, snoise(vWorld * 2.0 + vec2(0.0, uTime * 0.05)));
        float lace = smoothstep(0.55, 0.9, snoise(vWorld * 7.0 + uTime * 0.3)) * (1.0 - smoothstep(0.1, 0.45, shoreD));
        float foam = clamp((foamEdge * 0.95 + swash * 0.7 + lace * 0.35) * uFoamAmt, 0.0, 1.0);
        // three overlapping wave systems, each travelling in its own direction at its own speed; a slow swelling of
        // their strength across the sea (amplitude only, never bending the wavefronts) keeps it from looking mechanical
        float amp = 0.75 + 0.25 * snoise(vWorld * 0.035 + vec2(uTime * 0.01, 0.0));
        vec2 br = (wave(vWorld, 0.40, 8.0, 0.075, 0.0, uTime) + wave(vWorld, 1.00, 4.6, 0.05, 2.1, uTime) + wave(vWorld, -0.30, 2.5, 0.032, 4.3, uTime)) * amp * uWaveHeight;
        vec2 fine = grad * 0.072 * uTexture * 4.0;
        vec2 bend = (br + fine) * (1.0 - foam * 0.75) * uNormal;
        vec3 nW = normalize(vec3(-(vSea.y + bend.x), 1.0, -(vSea.z + bend.y)));
        normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float depth = max(vDepth, 0.0);
        // the diorama's colours by distance from the shore: aqua over the sand, turquoise, then the deeper teal
        vec3 water = mix(uGlass, uShallow, smoothstep(0.0, 0.25, shoreD));
        water = mix(water, uTurq, smoothstep(0.0, 0.7, shoreD));
        water = mix(water, uBlue, smoothstep(${SEA_LOOK.shoreBlend[0].toFixed(2)}, ${SEA_LOOK.shoreBlend[1].toFixed(2)}, shoreD));
        // and out over real depth, a little more ocean blue
        water = mix(water, uDeep, smoothstep(${SEA_LOOK.depthBlend[0].toFixed(2)}, ${SEA_LOOK.depthBlend[1].toFixed(2)}, depth));
        // broad drifting patches of teal, turquoise and deeper blue over the open sea
        float tA = snoise(vWorld / ${SEA_LOOK.tintScale.toFixed(1)} + vec2(uTime * 0.004, 3.0));
        float tB = snoise(vWorld / ${(SEA_LOOK.tintScale * 0.55).toFixed(1)} - vec2(5.0, uTime * 0.005));
        float open = smoothstep(0.4, 2.5, depth);
        water = mix(water, uTealMix, smoothstep(0.0, 0.8, tA) * ${SEA_LOOK.tintVariation.toFixed(3)} * open);
        water = mix(water, uOcean, smoothstep(0.1, 0.9, -tA * 0.6 + tB * 0.5) * ${SEA_LOOK.tintVariation.toFixed(3)} * 0.8 * smoothstep(1.5, 5.0, depth));
        water += 0.035 * snoise(vWorld * 0.6 + uTime * 0.03);
        float crest = clamp((vSea.x - ${SEA_LEVEL.toFixed(3)}) / 0.06, -1.0, 1.0);
        water *= 1.0 + crest * 0.05;
        diffuseColor.rgb = mix(water, vec3(0.97, 0.99, 0.98), foam);

        // transparency follows the real depth: sand and rocks show through the shallows, the deep is solid colour
        float clarity = 1.0 - smoothstep(0.0, uClarity, depth);
        diffuseColor.a = mix(clamp(mix(0.97, 0.2, clarity) * uOpacity, 0.0, 1.0), 0.98, foam);
        totalEmissiveRadiance += foam * vec3(0.18) + water * 0.08;`
      )
      .replace(
        '#include <opaque_fragment>',
        `// the sun's glints are not see-through: only the body of the water is, so they sparkle at full strength
        vec3 spec = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
        // reflection: the sun on the wave normals. Sparkle: extra glints where a wave's slope tips a facet toward the sun
        vec3 Vv = normalize(vViewPosition);
        vec3 Rr = reflect(-Vv, normal);
        float sunDot = 0.0;
        #if NUM_DIR_LIGHTS > 0
          sunDot = max(dot(Rr, directionalLights[0].direction), 0.0);
        #endif
        float tip = smoothstep(0.55, 1.0, 0.5 + 0.5 * snoise(vWorld * vec2(2.6, 3.4) * uWaveFreq + vec2(-uTime * 0.7 * uWaveSpeed, uTime * 0.3)));
        float glintPatch = smoothstep(0.0, 0.7, 0.5 + 0.5 * snoise(vWorld / ${SEA_LOOK.sparklePatch.toFixed(1)} + vec2(uTime * ${SEA_LOOK.glintSpeed.toFixed(3)}, 0.0)));
        spec = spec * uReflect + uSun * (pow(sunDot, 14.0) * tip * glintPatch * 1.6 * uSparkle) * (1.0 - foam);
        gl_FragColor = vec4((outgoingLight - spec) * diffuseColor.a + spec, diffuseColor.a);`
      )
  }
  return mat
}

