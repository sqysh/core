'use client'

import SuperFloatingMenu from '@/components/layout/SuperFloatingMenu'
import { AboutSection } from './_components/AboutSection'
import { CTASection } from './_components/CTASection'
import HeroSection from './_components/HeroSection'
import { MemberExpectations } from './_components/MemberExpectations'
import { PurposeOverview } from './_components/PurposeOverview'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { initiateGuidingLight } from '@/lib/actions/guiding-light/initiateGuidingLight'
import { createGame } from '@/lib/actions/games/createGame'
import { announceGame } from '@/lib/actions/games/wheel/announceGame'
import { seedGuidingLight } from '@/lib/actions/guiding-light/seedGuidingLight'
import { generateWeeklyMatches } from '@/lib/actions/1-2-1/generateWeeklyMatches'

export default function HomeClient({ currentJudge }: { currentJudge: { id: string; name: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const isSuperUser = session?.user?.role === 'SUPER_USER'
  const [initiating, setInitiating] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleInitiateGuidingLight() {
    setInitiating(true)
    await initiateGuidingLight()
    setInitiating(false)
    router.push('/guiding-light/stage')
  }

  async function handleLaunchGame() {
    if (launching) return
    setLaunching(true)
    await createGame('WHEEL') // 1. create the game FIRST
    await announceGame() // 2. then tell everyone to go to /games
    router.push('/games?view=tv') // 3. host to the TV
  }

  async function handleSeed() {
    await seedGuidingLight()
    router.refresh()
  }

  async function handleGenerateMatchups() {
    setGenerating(true)
    const res = await generateWeeklyMatches()
    setGenerating(false)
    if (res.success) router.push('/matchups')
  }

  return (
    <>
      {isSuperUser && (
        <SuperFloatingMenu
          currentJudge={currentJudge}
          initiating={initiating}
          launching={launching}
          onInitiateGuidingLight={handleInitiateGuidingLight}
          onLaunchGame={handleLaunchGame}
          onSeedGL={handleSeed}
          onGenerateMatchups={handleGenerateMatchups}
          generating={generating}
        />
      )}
      <HeroSection isLoggedIn={!!session?.user?.id} />
      <AboutSection />
      <PurposeOverview />
      <MemberExpectations />
      <CTASection />
    </>
  )
}
