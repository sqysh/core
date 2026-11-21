import { SafeSpline } from '@/components/_shared/SafeSpline'

/** The ocean's colours as a still, for a phone that can't run the scene (and under it while it loads) */
const OCEAN_STILL = (
  <div className="h-full w-full bg-[radial-gradient(120%_75%_at_50%_0%,#1f7fa0_0%,#0f4a6b_42%,#081c2c_100%)]" />
)

export default function OceanSpline() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <SafeSpline
        scene="https://prod.spline.design/2IXftBG73k86x6wG/scene.splinecode"
        label="hero"
        fallback={OCEAN_STILL}
        className="h-full w-full"
      />
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg-dark to-transparent pointer-events-none z-10" />
    </div>
  )
}
