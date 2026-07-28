import Link from 'next/link'

export const LaunchAppButton = () => {
  return (
    <Link
      href="/login"
      className="relative z-10 px-3.5 py-1.5 md:px-5 md:py-2.5 text-lg text-white backdrop-blur-lg border border-white/10 overflow-hidden group transition-all duration-300 hover:border-white/30"
    >
      <span className="relative z-10 text-sm md:text-base font-sora font-bold">Launch App</span>

      {/* Shiny sweep effect */}
      <div className="absolute inset-0 -left-full bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-1000 ease-out" />

      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-linear-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  )
}
