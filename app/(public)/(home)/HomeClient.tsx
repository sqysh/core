'use client'

import { AboutSection } from './_components/AboutSection'
import { CTASection } from './_components/CTASection'
import HeroSection from './_components/HeroSection'
import { MemberExpectations } from './_components/MemberExpectations'
import { PurposeOverview } from './_components/PurposeOverview'

export default function HomeClient({ isAuthed }: { isAuthed: boolean }) {
  return (
    <>
      <HeroSection isLoggedIn={isAuthed} />
      <AboutSection />
      <PurposeOverview />
      <MemberExpectations />
      <CTASection />
    </>
  )
}
