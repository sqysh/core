// One shared AudioContext for the synthesized sounds (check-in chime, boat engines and horns).
// Browsers keep it suspended until the page has had a tap or key press, so any gesture resumes it.

let ctx: AudioContext | null = null
let armed = false

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (!armed) {
    armed = true
    const resume = () => void ctx?.resume()
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, resume, { passive: true })
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

/** True once the context is running, so a sound will actually be heard */
export function audioReady() {
  return getAudioContext()?.state === 'running'
}
