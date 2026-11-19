'use client'

import { MutableRefObject, useEffect, useRef } from 'react'
import { HORIZON_Y, SCENE_W } from '@/app/(authenticated)/(active)/attendance/_lib/harborMap'

/** The sky canvas covers the picture from the top down to just past the horizon, so rain curtains reach the sea */
export const SKY_H = 1000

export interface Weather {
  time: number
  roll: number
  storm: number
  rain: number
  part: number
  sun: number
  /** Lightning lighting the clouds from inside: 0-1, and where (0-1 across, 0-1 down the sky canvas) */
  flash: number
  flashX: number
  flashY: number
}

export interface SkyRenderer {
  render: (w: Weather) => void
  clear: () => void
}

// Storm clouds drawn per pixel. The deck is domain-warped fractal noise: flattened like a real shelf of cloud,
// thick up top and ragged underneath, lit from above so billows catch light on their upper faces and fall into
// shadow below, with a bright rim where thin edges let the light through. Lightning lights it from inside, rain
// hangs from the base in curtains, and as it clears the gap fills with warm light.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uRoll, uStorm, uRain, uPart, uSun, uFlash, uHorizon;
uniform vec2 uFlashPos;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
const mat2 R = mat2(1.6, 1.2, -1.2, 1.6);
float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = R * p; a *= 0.5; } return v; }
float fbm4(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = R * p; a *= 0.5; } return v; }
// Cloud texture: smooth noise for the big masses, folded ("billow") noise for the fine detail, which rounds it into
// the cauliflower puffs a cumulonimbus is made of
// coarse hands back the first four octaves: the broad billows, which is what the lighting follows
float puffs(vec2 p, out float coarse) {
  float v = 0.0, a = 0.5;
  coarse = 0.0;
  for (int i = 0; i < 7; i++) {
    float n = noise(p);
    v += a * (i < 3 ? n : 1.0 - abs(n * 2.0 - 1.0) * 0.6);
    if (i == 3) coarse = v;
    p = R * p + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float puffs4(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    v += a * (i < 3 ? n : 1.0 - abs(n * 2.0 - 1.0) * 0.6);
    p = R * p + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec4 over(vec4 src, vec4 dst) { return src + dst * (1.0 - src.a); }

// shape the raw texture into the deck; prof is how deep into the deck we are (1 at the top, 0 below its base)
float shape(float n, float prof) {
  return n * (0.62 + 0.5 * prof) - (1.0 - prof) * 0.32 + prof * 0.06;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float u = fc.x / uRes.x;
  float y = 1.0 - fc.y / uRes.y;
  float aspect = uRes.x / uRes.y;

  // where the deck is: rolling in from the left, then splitting apart from the middle
  float edge = fbm3(vec2(y * 4.0, uTime * 0.05)) - 0.5;
  float arrive = 1.0 - smoothstep(-0.08, 0.08, u + edge * 0.35 - (uRoll * 1.5 - 0.3));
  float gap = smoothstep(0.0, 0.14, abs(u - 0.5) + edge * 0.25 + 0.3 - uPart);
  float cover = arrive * gap;

  // cloud space: wide and flattened like a real shelf, drifting right and slowly churning
  vec2 p = vec2(u * aspect, y) * vec2(1.25, 2.1);
  p.x -= uTime * 0.03;
  vec2 w = vec2(fbm4(p * 0.8 + vec2(0.0, uTime * 0.015)), fbm4(p * 0.8 + vec2(5.2, 1.3) - uTime * 0.012));
  vec2 P = p * 1.15 + (w - 0.5) * 0.6;

  float base = uHorizon * mix(0.48, 0.66, uStorm);
  float ragged = (fbm3(vec2(u * aspect * 3.0 - uTime * 0.03, 2.0)) - 0.5) * 0.18;
  float prof = 1.0 - smoothstep(base * 0.3, base, y + ragged);
  float coarse;
  float dens = shape(puffs(P, coarse), prof);
  float thr = mix(0.6, 0.44, uStorm);
  // coverage eats into the density rather than fading it, so arriving and parting clouds keep crisp edges
  float c = smoothstep(thr, thr + 0.025, dens - (1.0 - cover) * 0.5);

  // lighting: sunlight from above and a little to the left. Each puff is brighter on the side facing it, and the
  // deeper into the cloud a point is the less light reaches it
  // (the broad billows only, so the masses shade softly and only the edges carry the fine detail)
  float body = shape(coarse, prof);
  float toward = shape(puffs4(P + vec2(-0.03, -0.075)), prof);
  float lit = clamp(0.5 + (body - toward) * 3.6, 0.0, 1.0);
  lit = clamp(lit + (dens - body - 0.03) * 0.9, 0.0, 1.0); // a little of the fine texture as mottling
  float thick = smoothstep(thr, thr + 0.32, dens);
  float under = smoothstep(base * 0.1, base, y);

  vec3 dark = vec3(0.075, 0.085, 0.105);
  vec3 mid = vec3(0.29, 0.32, 0.37);
  vec3 bright = vec3(0.74, 0.77, 0.83);
  vec3 col = mix(dark, mid, lit);
  col = mix(col, bright, pow(lit, 2.6) * (1.0 - thick * 0.5) * (1.0 - under * 0.7));
  col *= mix(1.0, 0.62, thick);
  col *= mix(1.0, 0.55, under);
  col = mix(col, col * vec3(0.92, 1.0, 1.02), uStorm); // the faint green-teal cast of a heavy storm
  col *= mix(1.1, 0.78, uStorm);
  // thin edges glow where the light comes through them, golden as the sun returns
  float rim = 1.0 - smoothstep(thr, thr + 0.07, dens);
  col += mix(vec3(0.42, 0.45, 0.52), vec3(1.0, 0.82, 0.55), uSun) * rim * c * (0.35 + 0.9 * uSun) * (1.0 - uStorm * 0.6);

  // lightning inside the cloud: strongest near the strike, a dim wash everywhere else, brightest where it's thin
  vec2 fp = vec2(uFlashPos.x * aspect, uFlashPos.y);
  float fd = length(vec2(u * aspect, y) - fp);
  vec3 glow = vec3(0.8, 0.84, 1.0) * uFlash * (exp(-fd * 3.2) * 2.2 + 0.2);
  col += glow * (0.35 + 0.65 * (1.0 - thick));

  // scud: low, torn fragments racing along under the base
  vec2 sp = vec2(u * aspect * 2.6 - uTime * 0.09, y * 7.0);
  float band = smoothstep(base * 0.75, base * 1.02, y) * (1.0 - smoothstep(base * 1.05, base * 1.35, y));
  float scudD = puffs4(sp + w) * band;
  float scud = smoothstep(0.5, 0.62, scudD) * cover * uStorm * 0.75;
  vec3 scudCol = mix(vec3(0.1, 0.11, 0.13), vec3(0.24, 0.26, 0.3), smoothstep(0.5, 0.7, scudD)) + glow * 0.5;

  // the sky behind the deck goes dark
  float skyA = uStorm * 0.84 * cover * (1.0 - smoothstep(uHorizon * 0.95, uHorizon * 1.04, y));
  vec3 skyCol = mix(vec3(0.11, 0.13, 0.17), vec3(0.32, 0.35, 0.41), clamp(y / uHorizon, 0.0, 1.0));
  skyCol += vec3(0.45, 0.5, 0.66) * uFlash * 0.55;

  // rain curtains hanging from the base, streaked and falling, heavier in some places than others
  float curtain = fbm3(vec2(u * aspect * 2.4 + y * 0.6, uTime * 0.04));
  float streak = noise(vec2(u * aspect * 300.0 + y * 52.0, y * 5.0 - uTime * 10.0));
  float shaft = smoothstep(0.38, 0.72, curtain) * uRain * cover * smoothstep(base * 0.6, base * 1.05, y)
    * (1.0 - smoothstep(uHorizon * 0.98, uHorizon * 1.08, y));
  float veilA = shaft * (0.36 + 0.34 * streak);
  vec3 veilCol = vec3(0.29, 0.32, 0.38) + uFlash * 0.35;

  vec4 acc = vec4(skyCol * skyA, skyA);
  acc = over(vec4(veilCol * veilA, veilA), acc);
  acc = over(vec4(col * c, c), acc);
  acc = over(vec4(scudCol * scud * 0.9, scud * 0.9), acc);

  // clearing: soft light pouring through the gap, with faint shafts
  float rays = fbm3(vec2(atan(y + 0.2, u - 0.5) * 9.0, uTime * 0.05));
  float sunA = uSun * (1.0 - c) * (1.0 - smoothstep(0.0, uHorizon, y)) * (1.0 - smoothstep(0.0, 0.6, abs(u - 0.5)))
    * (0.14 + 0.14 * smoothstep(0.45, 0.75, rays));
  acc.rgb += vec3(1.0, 0.88, 0.66) * sunA;

  gl_FragColor = acc;
}
`

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[StormSky]', gl.getShaderInfoLog(s))
    return null
  }
  return s
}

/**
 * The storm's sky, drawn into the picture between the drifting clouds and the lighthouse, so the tower stands in
 * front of it. It sits idle until the storm hands it weather to draw; with no WebGL it never registers and the
 * storm falls back to plain clouds.
 */
export function StormSky({ skyRef }: { skyRef: MutableRefObject<SkyRenderer | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvas.current
    const gl = cv?.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!cv || !gl || gl.isContextLost()) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    // one triangle that covers the whole canvas
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const loc = (n: string) => gl.getUniformLocation(prog, n)
    const U = {
      res: loc('uRes'),
      time: loc('uTime'),
      roll: loc('uRoll'),
      storm: loc('uStorm'),
      rain: loc('uRain'),
      part: loc('uPart'),
      sun: loc('uSun'),
      flash: loc('uFlash'),
      flashPos: loc('uFlashPos'),
      horizon: loc('uHorizon')
    }
    gl.uniform1f(U.horizon, HORIZON_Y / SKY_H)

    // Render at the size it's actually shown on screen, so it's sharp on any TV without wasting pixels
    function fit() {
      const rect = cv!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (cv!.width !== w || cv!.height !== h) {
        cv!.width = w
        cv!.height = h
        gl!.viewport(0, 0, w, h)
        gl!.uniform2f(U.res, w, h)
      }
    }

    skyRef.current = {
      render(w) {
        fit()
        cv.style.visibility = 'visible'
        gl.uniform1f(U.time, w.time)
        gl.uniform1f(U.roll, w.roll)
        gl.uniform1f(U.storm, w.storm)
        gl.uniform1f(U.rain, w.rain)
        gl.uniform1f(U.part, w.part)
        gl.uniform1f(U.sun, w.sun)
        gl.uniform1f(U.flash, w.flash)
        gl.uniform2f(U.flashPos, w.flashX, w.flashY)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      },
      clear() {
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        cv.style.visibility = 'hidden'
      }
    }

    // No loseContext() here: the canvas keeps its context, and React mounting twice in development would hand the
    // second mount a dead one. The browser frees it with the canvas.
    return () => {
      skyRef.current = null
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [skyRef])

  return (
    <canvas
      ref={canvas}
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width: SCENE_W,
        height: SKY_H,
        visibility: 'hidden',
        // only the sky (and the sea at the horizon): the island, house and tower stay as drawn, darkened by the
        // scene's own storm tint rather than painted over (built by scripts/build-harbor-sky-mask.cjs)
        maskImage: 'url(/images/harbor/sky-mask.png)',
        maskSize: '100% 100%',
        WebkitMaskImage: 'url(/images/harbor/sky-mask.png)',
        WebkitMaskSize: '100% 100%'
      }}
      aria-hidden="true"
    />
  )
}
