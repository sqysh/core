'use client'

import { PurposeOverview } from './_components/PurposeOverview'
import { MemberExpectations } from './_components/MemberExpectations'
import { CTASection } from './_components/CTASection'
import HeroSection from './_components/HeroSection'
import { AboutSection } from './_components/AboutSection'

export default function Home() {
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
