'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { usePdf, usePdfPage } from '@/lib/hooks/usePdf'
import { PollStage } from './_components/PollStage'
import { TreasurerStage } from './_components/TreasurerStage'
import { ActivityStage } from './_components/ActivityStage'
import { Teleprompter, type TeleprompterHandle } from './_components/Teleprompter'
import MatchupsClient from './_components/MatchupsClient'
import {
  Matchup,
  Segment,
  STAGE_CHANNEL,
  STAGE_EVENT,
  StageCommand,
  StageMember,
  StagePerson,
  StagePresentation
} from '@/lib/constants/stage.constants'
import GuidingLightStageClient from '../guiding-light/stage/SixtyStageClient'
import { GuidingLightIntro } from './_components/GuidingLightIntro'
import { GuidingLightResult } from './_components/GuidingLightResult'
import { EducationIntro } from './_components/EducationIntro'
import { CoDirectorsIntro } from './_components/CoDirectorsIntro'
import { RoleIntro } from './_components/RoleIntro'
import { ClosingStage } from './_components/ClosingStage'
import { PresenterSpotlight } from './_components/PresenterSpotlight'

// The TV: Greg's laptop on /attendance. Five states, all driven by the host's
// remote over Pusher. Nothing on this screen is ever touched directly.
//   holding   the live check-in board (your existing component, passed in)
//   script    the opening, scrolled past a reading line, read from 20 feet
//   slides    the presenter's PDF, one page at a time
//   video     the presenter's MP4
//   matchups  this week's 1-2-1 pairs

type Mode =
  | 'holding'
  | 'script'
  | 'slides'
  | 'video'
  | 'spotlight'
  | 'activity'
  | 'matchups'
  | 'poll'
  | 'treasurer'
  | 'intro'
  | 'guiding-light'
  | 'sixty'
  | 'education'
  | 'co-directors'
  | 'event-coordinator'
  | 'membership'
  | 'closing'

export default function StageClient({
  segments,
  presentation,
  matchups,
  guidingLight,
  education,
  members,
  openRoundId,
  isSuperUser,
  board,
  coDirectors,
  eventCoordinator,
  membership,
  todayWinner,
  loadMatchups
}: {
  segments: Segment[]
  presentation: StagePresentation | null
  matchups: Matchup[]
  guidingLight: StagePerson | null
  education: StagePerson | null
  members: StageMember[]
  openRoundId: string | null
  isSuperUser: boolean
  /** The live check-in board: name tiles, QR, sound. Shown whenever the stage is idle. */
  board: ReactNode
  coDirectors: StagePerson[]
  eventCoordinator: StagePerson | null
  membership: StagePerson[]
  /** Today's Guiding Light if the round is already REVEALED (TV refreshed mid-meeting). */
  todayWinner: StagePerson | null
  /** Pulls the week's pairs fresh when matchups go up, since they're generated mid-meeting. */
  loadMatchups?: () => Promise<Matchup[]>
}) {
  const [mode, setMode] = useState<Mode>('holding')
  // the poll overlays whatever's up, so remember the current screen (and the one
  // from before the poll) to return to when the host ends it
  const modeRef = useRef<Mode>('holding')
  modeRef.current = mode
  const prePollModeRef = useRef<Mode>('holding')
  const [pollId, setPollId] = useState<string | null>(null)
  const [matchupsRun, setMatchupsRun] = useState(0)
  const [liveMatchups, setLiveMatchups] = useState<Matchup[]>(matchups)
  const [presenterName, setPresenterName] = useState<string | null>(null)
  const [spotlightRun, setSpotlightRun] = useState(0)
  // the teleprompter owns the script scroll, countdown and speaking engine; the
  // stage drives it through this handle
  const tpRef = useRef<TeleprompterHandle | null>(null)

  // Once the judge picks, the result outlives the carousel: going back to the
  // guiding-light screen shows the winner instead of replaying the intro.
  const [glWinner, setGlWinner] = useState<StagePerson | null>(todayWinner)
  useEffect(() => {
    const channel = getPusherClient().subscribe('guiding-light')
    const onWinner = (data: { winner: { name: string; company: string | null; profileImage: string | null } }) => {
      if (data?.winner?.name)
        setGlWinner({
          name: data.winner.name,
          company: data.winner.company ?? null,
          image: data.winner.profileImage ?? null
        })
    }
    channel.bind('winner-selected', onWinner)
    return () => {
      channel.unbind('winner-selected', onWinner)
    }
  }, [])

  // presentation
  const [page, setPage] = useState(1)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [size, setSize] = useState({ w: 1920, h: 1080 })

  const { doc } = usePdf(mode === 'slides' && presentation?.kind === 'SLIDES' ? presentation.fileUrl : null)
  const canvasRef = usePdfPage(doc, page, size.w, size.h)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // The browser blocks a page from playing audio until it has had one user
  // interaction, and the TV is driven over Pusher, not clicks. The one-tap gate
  // below is that interaction: the host taps it once while setting the TV up,
  // which arms audio for the whole meeting (matchups clatter, the drumroll, etc.).
  const [started, setStarted] = useState(false)
  function startStage() {
    // prime audio inside the gesture so every later sound is allowed to play
    try {
      const a = new Audio('/sound-effects/flap-done.mp3')
      a.volume = 0
      a.play()
        .then(() => {
          a.pause()
          a.currentTime = 0
        })
        .catch(() => {})
    } catch {}
    setStarted(true)
  }

  useEffect(() => {
    const channel = getPusherClient().subscribe(STAGE_CHANNEL)

    channel.bind(STAGE_EVENT, (cmd: StageCommand) => {
      switch (cmd.type) {
        case 'holding':
          tpRef.current?.reset()
          setMode('holding')
          break
        case 'script.play':
          setMode('script')
          tpRef.current?.play({ countdown: cmd.countdown })
          break
        case 'script.pause':
          tpRef.current?.pause()
          break
        case 'script.speed':
          tpRef.current?.setSpeed(cmd.value)
          break
        case 'script.jump':
          setMode('script')
          tpRef.current?.jump(cmd.value, { countdown: cmd.countdown, play: cmd.play })
          break
        case 'script.rewind':
          tpRef.current?.rewind()
          break
        case 'present.start':
          if (!presentation || presentation.id !== cmd.presentationId) return
          tpRef.current?.pause()
          setPage(1)
          setMode(presentation.kind === 'VIDEO' ? 'video' : 'slides')
          break
        case 'present.page':
          setPage(cmd.value)
          break
        case 'present.video': {
          const v = videoRef.current
          if (!v) return
          if (cmd.value === 'play') v.play().catch(() => {})
          if (cmd.value === 'pause') v.pause()
          if (cmd.value === 'restart') {
            v.currentTime = 0
            v.play().catch(() => {})
          }
          break
        }
        case 'present.end':
          tpRef.current?.pause()
          setMode('activity')
          break
        case 'activity.show':
          tpRef.current?.pause()
          setMode('activity')
          break
        case 'presenter.spotlight':
          tpRef.current?.pause()
          setPresenterName(cmd.name)
          setSpotlightRun((n) => n + 1)
          setMode('spotlight')
          break
        case 'matchups.show':
          tpRef.current?.pause()
          // the pairs are generated mid-meeting, so pull them fresh, then mount
          if (loadMatchups) {
            loadMatchups()
              .then((m) => setLiveMatchups(m))
              .catch(() => {})
              .finally(() => {
                setMatchupsRun((n) => n + 1)
                setMode('matchups')
              })
          } else {
            setMatchupsRun((n) => n + 1)
            setMode('matchups')
          }
          break
        case 'poll.show':
          tpRef.current?.pause()
          if (modeRef.current !== 'poll') prePollModeRef.current = modeRef.current
          setPollId(cmd.pollId)
          setMode('poll')
          break
        case 'poll.end':
          // back to whatever the poll was covering
          setMode(prePollModeRef.current)
          break
        case 'treasurer.show':
          tpRef.current?.pause()
          setMode('treasurer')
          break
        case 'co-directors.show':
          tpRef.current?.pause()
          setMode('co-directors')
          break
        case 'event-coordinator.show':
          tpRef.current?.pause()
          setMode('event-coordinator')
          break
        case 'membership.show':
          tpRef.current?.pause()
          setMode('membership')
          break
        case 'guiding-light.show':
          tpRef.current?.pause()
          setMode('guiding-light')
          break
        case 'sixty.show':
          tpRef.current?.pause()
          setMode('sixty')
          break
        case 'education.show':
          tpRef.current?.pause()
          setMode('education')
          break
        case 'closing.show':
          tpRef.current?.pause()
          setMode('closing')
          break
      }
    })

    return () => {
      channel.unbind_all()
      releaseChannel(STAGE_CHANNEL)
    }
  }, [loadMatchups, presentation])

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#06101b] text-white">
      {/* ── Holding: the check-in board ── */}
      {mode === 'holding' && <div className="absolute inset-0">{board}</div>}

      {/* ── Script (scroll, countdown and speaking engine live in here) ── */}
      <Teleprompter ref={tpRef} segments={segments} active={mode === 'script'} onEnd={() => setMode('closing')} />

      {/* ── Slides ── */}
      {mode === 'slides' && presentation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <canvas ref={canvasRef} className="block" />
          <p className="absolute right-10 bottom-8 font-mono text-[26px] tabular-nums text-white/35">
            {presentation.presenter.name} · {page}
            {doc ? ` / ${doc.numPages}` : ''}
          </p>
        </div>
      )}

      {/* ── Video ── */}
      {mode === 'video' && presentation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={presentation.fileUrl}
            className="h-full w-full object-contain"
            playsInline
            preload="auto"
          />
        </div>
      )}

      {/* ── Presenter spotlight (nothing uploaded) ── */}
      {mode === 'spotlight' && <PresenterSpotlight key={spotlightRun} name={presenterName} />}

      {/* ── Activity Round ── */}
      {mode === 'activity' && <ActivityStage />}

      {/* ── Matchups ── */}
      {mode === 'matchups' && (
        <MatchupsClient key={matchupsRun} pairs={liveMatchups} isSuperUser={isSuperUser} autoStart />
      )}

      {/* ── Poll ── */}
      {mode === 'poll' && pollId && <PollStage pollId={pollId} />}

      {/* ── Treasurer ── */}
      {mode === 'treasurer' && <TreasurerStage />}

      {/* ── Guiding Light: the lighthouse intro before the pick, the result after ── */}
      {mode === 'guiding-light' &&
        (glWinner ? (
          <GuidingLightResult winner={glWinner} judgeName={guidingLight?.name ?? null} />
        ) : (
          guidingLight && <GuidingLightIntro person={guidingLight} />
        ))}

      {/* —— Education —— */}
      {mode === 'education' && education && <EducationIntro person={education} />}

      {mode === 'co-directors' && coDirectors.length > 0 && <CoDirectorsIntro people={coDirectors} />}

      {/* ── Event Coordinator ── */}
      {mode === 'event-coordinator' && eventCoordinator && (
        <RoleIntro label="Event Coordinator" people={[eventCoordinator]} accent="#fb923c" />
      )}

      {/* ── Membership Committee ── */}
      {mode === 'membership' && membership.length > 0 && (
        <RoleIntro label="Membership Committee" people={membership} accent="#2dd4bf" />
      )}

      {/* ── Closing quotes on rotation ── */}
      {mode === 'closing' && <ClosingStage />}

      {/* ── Guiding Light carousel + reveal ── */}
      {mode === 'sixty' && (
        <GuidingLightStageClient
          members={members.map((m) => ({ id: m.id, name: m.name, company: m.company, profileImage: m.profileImage }))}
          judgeName={guidingLight?.name ?? null}
          openRoundId={openRoundId}
          isSuperUser={isSuperUser}
          initialWinner={
            glWinner
              ? (members.find((m) => m.name === glWinner.name) ?? {
                  id: '',
                  name: glWinner.name,
                  company: glWinner.company,
                  profileImage: glWinner.image
                })
              : null
          }
          showChrome={false}
        />
      )}

      {/* ── One-tap start gate: arms audio for the meeting, then reveals the stage ── */}
      {!started && (
        <button
          onClick={startStage}
          className="group absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-[3vh] bg-[radial-gradient(120%_90%_at_50%_-15%,#0c1b2e_0%,#081421_45%,#06101b_100%)] text-center"
        >
          <p className="font-mono text-[1.1vw] tracking-[0.4em] uppercase text-primary-dark">
            Coastal Referral Exchange
          </p>
          <p className="font-sora text-[6vw] font-black leading-none tracking-[-0.03em] text-white">Tap to start</p>
          <p className="max-w-[46vw] font-nunito text-[1.3vw] leading-snug text-white/50">
            One tap gets the stage ready, sound and all. Do it once when you set the TV up.
          </p>
          <span className="mt-[2vh] animate-pulse font-mono text-[0.9vw] tracking-[0.35em] uppercase text-white/35 group-hover:text-primary-dark">
            Tap anywhere
          </span>
        </button>
      )}
    </div>
  )
}
