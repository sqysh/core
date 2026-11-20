import { Material, MeshStandardMaterial } from 'three'
import { seaUniforms } from '../seaLook'
import { SEA_GLSL } from '../waves'

// What a hull looks like below the surface, seen down through the water. The sea is all but opaque out in the harbor
// (its clarity follows the depth to the seabed), which hid everything under a boat's waterline and left each one
// looking sliced off at the surface. But looking down at a hull, the light only crosses the few tenths of water above
// it, so it should show: bottom paint, keel, rudder and propeller, tinted and fading the deeper they go.
//
// So the submerged parts are drawn a second time, after the water, with this material: it keeps only what is below the
// live sea surface (the same swell the water draws), tints it toward the sea's colour by depth and fades it out.

/** The sea's clock, advanced with the scene so the cut follows the swell */
export const seaTime = { value: 0 }
/** Draws after the water (renderOrder 1) and before the collars and wakes (2, 3) */
export const SUBMERGED_ORDER = 1.5

const cache = new WeakMap<Material, MeshStandardMaterial>()

export function submerged(base: MeshStandardMaterial): MeshStandardMaterial {
  const hit = cache.get(base)
  if (hit) return hit
  const m = new MeshStandardMaterial({
    color: base.color.clone(),
    map: base.map,
    roughness: 0.6,
    side: base.side,
    transparent: true,
    depthWrite: false
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSeaTime = seaTime
    shader.uniforms.uWater = seaUniforms.uBlue
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSubWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 subW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          subW = instanceMatrix * subW;
        #endif
        vSubWorld = (modelMatrix * subW).xyz;`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uSeaTime;\nuniform vec3 uWater;\nvarying vec3 vSubWorld;\n${SEA_GLSL}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float subDepth = sea(vSubWorld.xz, uSeaTime, 1.0).x - vSubWorld.y;
        if (subDepth < 0.004) discard;`
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uWater, 0.3 + 0.5 * smoothstep(0.0, 0.9, subDepth));
        gl_FragColor.a = mix(0.85, 0.28, smoothstep(0.0, 1.0, subDepth));`
      )
  }
  m.customProgramCacheKey = () => 'submerged'
  cache.set(base, m)
  return m
}
