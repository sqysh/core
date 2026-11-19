import { TYPE_MS, TypeText } from '@/components/_shared/SqyshVector'
import { TYPE_LAG, type Bubble } from '@/app/(authenticated)/(active)/check-in/_lib/script'
import { delay } from '@/app/(authenticated)/(active)/check-in/_lib/motion'

const SHELL =
  'absolute bottom-full left-1/2 w-max max-w-[min(calc(100vw-2rem),300px)] border border-white/15 bg-white/7 px-4 py-3 text-center backdrop-blur-md xs:px-5 opacity-0'
const TEXT =
  'relative m-0 font-sora text-[15px] font-semibold leading-snug tracking-[-0.015em] text-balance xs:text-[16px]'

function Tail() {
  return (
    <span
      className="absolute left-1/2 -bottom-1.75 -ml-1.5 h-3 w-3 rotate-45 border-r border-b border-white/15 bg-white/7"
      aria-hidden="true"
    />
  )
}

interface SpeechBubblesProps {
  bubbles: Bubble[]
  firstName: string
  settle: number
  reduce: boolean
  /** The judge's "round opened" line, shown on top of the script */
  sendOff: boolean
}

// All anchored above the ring, each on its own in/out timing
export function SpeechBubbles({ bubbles, firstName, settle, reduce, sendOff }: SpeechBubblesProps) {
  return (
    <>
      {sendOff && (
        <div
          className={`${SHELL} z-3 mb-12 animate-[ciBubIn_0.55s_cubic-bezier(0.34,1.5,0.64,1)_0.35s_both,ciBubOut_0.4s_ease_2.1s_forwards]`}
        >
          <p className={TEXT}>
            <TypeText text="Here we go. Opening your shortlist." startAt={0.6} reduce={reduce} />
          </p>
          <Tail />
        </div>
      )}

      {bubbles.map((b, i) => {
        const at = b.parked ? settle + b.at : b.at
        const until = b.parked ? settle + b.until : b.until
        const text = b.text(firstName)

        return (
          <div
            key={i}
            className={`${SHELL} animate-[ciBubIn_0.55s_cubic-bezier(0.34,1.5,0.64,1)_both,ciBubOut_0.45s_ease_forwards] ${
              b.parked ? 'mb-8' : 'mb-3'
            }`}
            style={delay(at, until)}
          >
            <p className={TEXT}>
              <TypeText text={text} startAt={at + TYPE_LAG} reduce={reduce} />
              {b.dots && (
                <span className="ml-0.5 inline-flex" aria-hidden="true">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="opacity-0 animate-[ciDots_1.2s_ease-in-out_infinite]"
                      style={delay(b.at + TYPE_LAG + (text.length * TYPE_MS) / 1000 + d * 0.2)}
                    >
                      .
                    </span>
                  ))}
                </span>
              )}
            </p>
            <Tail />
          </div>
        )
      })}
    </>
  )
}
