import { Color, MeshStandardMaterial } from 'three'
import { grainTextures } from './grainTextures'

// The shared granite material, tuned for CORE's sculpted miniature look rather than photographic realism. The rock's
// form and colour (warm tops, pink-gray faces, soft occlusion) come from its geometry and vertex colours; the material
// adds restrained surface detail, laid on triplanar so it needs no UVs and never stretches:
//
//  · a faint salt-and-pepper grain and gentle weathering relief, felt more than seen
//  · small, crisp-edged moss cushions where the asset allows moss (its `aCover` attribute: upward, sheltered faces)
//  · pale lichen rosettes on the weathered tops, and a few orange ones on seaward faces
//  · the shoreline by height above the sea: darker wet rock at the water, a soft dark lichen band above it, olive
//    rockweed just below. It follows wherever the rock is placed.
//
// One material is shared by every granite asset; instanced meshes work too.

export type GraniteSettings = {
  /** Height of the sea, or null for rock that never meets it */
  seaLevel: number | null
  /** Grain tiles per world unit */
  grainScale: number
  /** Strength of the surface relief (0 = smooth planes) */
  normalStrength: number
}

export const GRANITE_DEFAULTS: GraniteSettings = { seaLevel: null, grainScale: 4.2, normalStrength: 0.45 }

let shared: MeshStandardMaterial | null = null
const uniforms = {
  uGrainA: { value: null as unknown },
  uWeather: { value: null as unknown },
  uGrainScale: { value: GRANITE_DEFAULTS.grainScale },
  uNormalStrength: { value: GRANITE_DEFAULTS.normalStrength },
  uSeaLevel: { value: 0 },
  uZonation: { value: 0 },
  uMoss: { value: new Color('#52692e') },
  uMossLit: { value: new Color('#7a8c40') },
  uLichen: { value: new Color('#cfcdb6') },
  uLichenOrange: { value: new Color('#d08d3a') },
  uBand: { value: new Color('#3d3a36') },
  uWeed: { value: new Color('#5d5226') }
}

/** Changes the shared material's settings (every granite asset follows) */
export function setGranite(s: Partial<GraniteSettings>) {
  if (s.grainScale !== undefined) uniforms.uGrainScale.value = s.grainScale
  if (s.normalStrength !== undefined) uniforms.uNormalStrength.value = s.normalStrength
  if (s.seaLevel !== undefined) {
    uniforms.uZonation.value = s.seaLevel === null ? 0 : 1
    uniforms.uSeaLevel.value = s.seaLevel ?? 0
  }
}

export function graniteMaterial() {
  if (shared) return shared
  const grain = grainTextures()
  uniforms.uGrainA.value = grain.albedo
  uniforms.uWeather.value = grain.weather
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })
  mat.customProgramCacheKey = () => 'core-granite-v7'
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aCover;
        varying vec3 vTPos;
        varying vec3 vTNrm;
        varying float vCover;`
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          mat4 tm = modelMatrix;
          #ifdef USE_INSTANCING
            tm = modelMatrix * instanceMatrix;
          #endif
          vTPos = (tm * vec4(transformed, 1.0)).xyz;
          vTNrm = normalize(mat3(tm) * objectNormal);
          vCover = aCover;
        }`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uGrainA;
        uniform sampler2D uWeather;
        uniform float uGrainScale;
        uniform float uNormalStrength;
        uniform float uSeaLevel;
        uniform float uZonation;
        uniform vec3 uMoss;
        uniform vec3 uMossLit;
        uniform vec3 uLichen;
        uniform vec3 uLichenOrange;
        uniform vec3 uBand;
        uniform vec3 uWeed;
        varying vec3 vTPos;
        varying vec3 vTNrm;
        varying float vCover;
        vec3 tpWeights(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }
        vec4 tpSample(sampler2D t, vec3 p, vec3 w, float s) {
          return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 tpN = normalize(vTNrm);
        vec3 tpW = tpWeights(tpN);
        vec4 grain = tpSample(uGrainA, vTPos, tpW, uGrainScale);
        float broad = tpSample(uWeather, vTPos, tpW, uGrainScale * 0.05).a;
        float small = tpSample(uWeather, vTPos, tpW, uGrainScale * 0.2).a;
        // the stone: a faint grain and soft weathering, never a photograph
        diffuseColor.rgb *= mix(vec3(1.0), grain.rgb * 1.6, 0.16);
        diffuseColor.rgb *= 0.9 + 0.2 * broad;

        // the shoreline, by height above the sea, its upper edge softly ragged
        float hs = vTPos.y - uSeaLevel + (broad - 0.5) * 0.14;
        float wet = uZonation * (1.0 - smoothstep(0.03, 0.15, hs));
        float band = uZonation * smoothstep(0.05, 0.12, hs) * (1.0 - smoothstep(0.3, 0.44, hs));
        float weed = uZonation * (1.0 - smoothstep(-0.14, -0.02, hs)) * smoothstep(0.5, 0.56, small);
        diffuseColor.rgb = mix(diffuseColor.rgb, uBand, band * 0.6);
        diffuseColor.rgb *= 1.0 - 0.28 * wet;
        diffuseColor.rgb = mix(diffuseColor.rgb, uWeed, weed * 0.85);

        // moss: small cushions with crisp, soft-edged outlines, only where the asset allows it
        float mossShape = smoothstep(0.62, 0.66, broad * 0.6 + vCover * 0.45 + (small - 0.5) * 0.12);
        float moss = mossShape * smoothstep(0.3, 0.6, vCover) * (1.0 - wet);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(uMoss, uMossLit, smoothstep(0.55, 0.95, tpN.y) * small), moss);

        // lichen: pale rosettes on weathered tops above the spray, a few orange ones on seaward faces
        float up = smoothstep(0.1, 0.6, tpN.y + 0.2);
        float above = uZonation > 0.5 ? smoothstep(0.55, 0.8, hs) : 1.0;
        float rosette = smoothstep(0.71, 0.73, small) * up * above * (1.0 - moss);
        diffuseColor.rgb = mix(diffuseColor.rgb, uLichen, rosette * 0.3);
        float orange = smoothstep(0.74, 0.76, tpSample(uWeather, vTPos + 3.7, tpW, uGrainScale * 0.3).a)
          * smoothstep(0.0, 0.5, tpN.z) * above * (1.0 - moss);
        diffuseColor.rgb = mix(diffuseColor.rgb, uLichenOrange, orange * 0.6);
        float cover = max(moss, max(rosette, orange));`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (0.85 + 0.25 * grain.a), 0.05, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.95, moss);
        roughnessFactor = mix(roughnessFactor, 0.35, wet);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // gentle relief: weathering swells over a faint grain, quieter still under moss, lichen and water
          float st = uNormalStrength * (1.0 - 0.7 * cover) * (1.0 - 0.5 * wet);
          float ws = uGrainScale * 0.09;
          vec3 tnX = texture2D(uWeather, vTPos.zy * ws).xyz * 2.0 - 1.0;
          vec3 tnY = texture2D(uWeather, vTPos.xz * ws).xyz * 2.0 - 1.0;
          vec3 tnZ = texture2D(uWeather, vTPos.xy * ws).xyz * 2.0 - 1.0;
          tnX.xy *= st;
          tnY.xy *= st;
          tnZ.xy *= st;
          tnX = vec3(tnX.xy + tpN.zy, abs(tnX.z) * tpN.x);
          tnY = vec3(tnY.xy + tpN.xz, abs(tnY.z) * tpN.y);
          tnZ = vec3(tnZ.xy + tpN.xy, abs(tnZ.z) * tpN.z);
          vec3 wn = normalize(tnX.zyx * tpW.x + tnY.xzy * tpW.y + tnZ.xyz * tpW.z);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
        }`
      )
  }
  shared = mat
  return mat
}
