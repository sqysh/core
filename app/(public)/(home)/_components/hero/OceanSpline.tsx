import dynamic from 'next/dynamic'

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

export default function OceanSpline() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Spline
        scene="https://prod.spline.design/2IXftBG73k86x6wG/scene.splinecode"
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%'
        }}
      />
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg-dark to-transparent pointer-events-none z-10" />
    </div>
  )
}
