import { FC } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/app/lib/constants/motion'
import LaunchAppButton from '../common/LaunchAppButton'
import Marquee from 'react-fast-marquee'

export const logos = [
  { name: 'Sqysh', src: '/logos/company1.png' },
  { name: 'Saltwater Bookkeepping', src: '/logos/company2.png' },
  { name: 'Century21', src: '/logos/company3.png' },
  { name: 'Eastern Bank', src: '/logos/company4.png' },
  { name: 'Touchstone Closing & Escrow', src: '/logos/company5.png' },
  { name: 'Boys & Girls Club of Lynn', src: '/logos/company6.png' },
  { name: 'The Drummlin Group', src: '/logos/company7.png' },
  { name: 'Zellik Insurance', src: '/logos/company8.png' },
  { name: 'CrossCountry Mortgage LLC', src: '/logos/company9.png' },
  { name: 'Northwestern Mutual', src: '/logos/company10.png' },
  { name: 'Commonwealth Payroll & HR', src: '/logos/company11.png' },
  { name: 'Prudential Life Insurance', src: '/logos/company12.png' },
  { name: 'Finneran & Nicholson', src: '/logos/company13.png' }
]

const StepMarquee = () => {
  const allLogos = [...logos, ...logos, ...logos]

  return (
    <div className="w-full py-1 absolute bottom-10">
      <div className="max-w-6xl mx-auto">
        <Marquee speed={75} gradientWidth={100} pauseOnHover={false}>
          {allLogos.map((logo, index) => (
            <div key={`${logo.name}-${index}`} className="mx-16 flex items-center justify-center font-sora text-white">
              {logo.name}
            </div>
          ))}
        </Marquee>
      </div>
    </div>
  )
}

const HeroSection: FC<{ isVisible: boolean }> = ({ isVisible }) => {
  return (
    <motion.section
      className="-mt-18.5 py-16 md:py-28 flex flex-col items-center justify-center text-white overflow-hidden relative bg-no-repeat bg-cover bg-center w-full min-h-screen"
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      style={{ backgroundImage: `url('/images/hero.png')` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Gradient blobs - optimized for mobile */}
      <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-64 h-64 md:w-96 md:h-96 opacity-20 md:opacity-30">
        <div className="w-full h-full bg-teal-500 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-64 h-64 md:w-96 md:h-96 opacity-20 md:opacity-30">
        <div className="w-full h-full bg-blue-600 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 w-64 h-64 md:w-96 md:h-96 opacity-20 md:opacity-30">
        <div className="w-full h-full bg-cyan-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 md:px-6 text-center">
        <motion.div variants={fadeInUp} className="flex items-center justify-center flex-col">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-bold mb-4 md:mb-6 font-sora leading-tight">
            <span className="bg-linear-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-2xl">
              Where business meets
            </span>
            <br />
            the{' '}
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-linear-to-r from-blue-600/40 to-cyan-600/40 -z-10 transform -skew-x-2 rounded-lg"></span>
              <span className="relative bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent drop-shadow-2xl px-3 md:px-6 py-1 md:py-2">
                horizon
              </span>
            </span>
          </h1>
          <div className="mb-6 md:mb-8 max-w-2xl w-full text-base sm:text-lg md:text-xl text-[#cfddde] font-sora font-bold px-4">
            Join forces with like-minded entrepreneurs who believe in connection, collaboration, and creating real
            opportunities that lead to lasting growth.
          </div>
        </motion.div>

        <div className="flex items-center justify-center">
          <LaunchAppButton />
        </div>
      </div>
      <StepMarquee />
    </motion.section>
  )
}

export default HeroSection
