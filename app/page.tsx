'use client'

import { PurposeOverview } from './components/public/home/PurposeOverview'
import { MemberExpectations } from './components/public/home/MemberExpectations'
import { CTASection } from './components/public/home/CTASection'
import HeroSection from './components/public/home/HeroSection'
import { AboutSection } from './components/public/home/AboutSection'

const Home = () => {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <PurposeOverview />
      <MemberExpectations />
      <CTASection />
    </>
  )
}

export default Home
