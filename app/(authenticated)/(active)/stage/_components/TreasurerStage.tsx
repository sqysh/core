// Treasurer UI, grouped: the TV board (TreasurerStage, anonymous + animated with
// a ledger strip), the balance entry (TreasuryBalanceCard), the private named
// roster (TreasurerRoster), and the live obligations manager (ObligationsCard).
'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { getPusherClient, releaseChannel } from '@/lib/pusher/pusherClient'
import { addObligation } from '@/lib/actions/treasury/addObligation'
import { getTreasurerBoard } from '@/lib/actions/treasury/getTreasurerBoard'
import { removeObligation } from '@/lib/actions/treasury/removeObligation'
import { setBankBalance } from '@/lib/actions/treasury/setBankBalance'
import {
  TREASURY_CHANNEL,
  TREASURY_EVENT,
  TreasurerBoard,
  TreasuryObligationItem
} from '@/lib/constants/stage.constants'

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// kept-alive audio per sound, rewound before each play (plays once the TV is armed
// by the start gate). public/sound-effects/<name>.mp3
const audioCache = new Map<string, HTMLAudioElement>()
function playSfx(name: string, vol = 0.5) {
  try {
    let a = audioCache.get(name)
    if (!a) {
      a = new Audio(`/sound-effects/${name}.mp3`)
      audioCache.set(name, a)
    }
    a.volume = vol
    a.currentTime = 0
    a.play().catch(() => {})
  } catch {}
}

function useCountUp(target: number, ms = 1500, onDone?: () => void) {
  const [n, setN] = useState(0)
  const from = useRef(0)
  const doneRef = useRef(false)
  useEffect(() => {
    doneRef.current = false
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setN(a + (target - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else {
        from.current = target
        if (!doneRef.current) {
          doneRef.current = true
          onDone?.()
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms])
  return n
}

function shuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── TV ───────────────────────────────────────────────────────────────────────

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      className="flex-1 border-l-2 border-white/10 px-[2vw] text-left first:border-l-0 first:pl-0"
    >
      <p className="font-mono text-[1.1vw] tracking-[0.2em] uppercase text-white/40">{label}</p>
      <p
        className={`mt-[0.6vh] font-sora text-[2.8vw] font-black tabular-nums ${accent ? 'text-indigo-200' : 'text-white'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-[0.3vh] font-mono text-[0.95vw] uppercase tracking-[0.1em] text-white/35">{sub}</p>}
    </motion.div>
  )
}

export function TreasurerStage() {
  const [board, setBoard] = useState<TreasurerBoard | null>(null)

  async function load() {
    const res = await getTreasurerBoard()
    if (res.success) setBoard(res.data)
  }

  useEffect(() => {
    // the board sweeping onto the TV
    playSfx('treasury-reveal', 0.5)
    load()
    const channel = getPusherClient().subscribe(TREASURY_CHANNEL)
    channel.bind(TREASURY_EVENT, () => load())
    return () => {
      channel.unbind_all()
      releaseChannel(TREASURY_CHANNEL)
    }
  }, [])

  const cards = useMemo(
    () =>
      board
        ? shuffle(
            board.members.map((m) => m.hasCard),
            board.members.map((m) => m.id).join()
          )
        : [],
    [board]
  )
  // cha-ching when the balance lands on its final number
  const balance = useCountUp(board?.balance ?? 0, 1500, () => {
    if (board?.balance) playSfx('treasury-cash', 0.6)
  })
  const withCard = useCountUp(board?.withCard ?? 0, 1300)

  if (!board) return null
  const pct = board.total ? (board.withCard / board.total) * 100 : 0
  const cols = Math.min(12, Math.max(6, Math.ceil(Math.sqrt(board.total * 1.8))))
  const oblTotal = board.obligations.reduce((s, o) => s + o.amount, 0)
  const free = board.balance == null ? null : board.balance - oblTotal

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4vh] bg-[radial-gradient(130%_100%_at_50%_-10%,#141b33_0%,#0a1020_55%,#070b16_100%)] px-[6vw] text-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="font-mono text-[1.6vw] tracking-[0.4em] uppercase text-indigo-300/80">Treasurer</p>
        <p className="mt-[1.2vh] font-mono text-[1.3vw] tracking-[0.2em] uppercase text-white/40">In the account</p>
        <p className="mt-[0.4vh] font-sora text-[8vw] font-black leading-none tracking-[-0.04em] text-indigo-200 tabular-nums">
          {board.balance == null ? '—' : money(balance)}
        </p>
      </motion.div>

      {/* ledger strip */}
      <motion.div
        className="flex w-full max-w-[64vw] items-stretch"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
        initial="hidden"
        animate="show"
      >
        <Tile
          label="Next room dues"
          value={fmtDate(board.roomDue.dueDate)}
          sub={`${money(board.roomDue.amount)} / member`}
        />
        <Tile
          label="Owed out"
          value={money(oblTotal)}
          sub={`${board.obligations.length} obligation${board.obligations.length === 1 ? '' : 's'}`}
        />
        <Tile label="Free to spend" value={free == null ? '—' : money(free)} accent />
      </motion.div>

      {/* obligation lines, if any */}
      {board.obligations.length > 0 && (
        <motion.div
          className="flex max-w-[64vw] flex-wrap justify-center gap-[1vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {board.obligations.map((o) => (
            <span
              key={o.id}
              className="rounded-full border border-white/10 bg-white/5 px-[1.4vw] py-[0.7vh] font-nunito text-[1.2vw] text-white/70"
            >
              {o.label} <span className="font-bold text-white/90">{money(o.amount)}</span>
              {o.dueDate && <span className="text-white/35"> · {fmtDate(o.dueDate)}</span>}
            </span>
          ))}
        </motion.div>
      )}

      {/* anonymous dot grid */}
      <motion.div
        className="grid w-full max-w-[64vw] justify-center gap-[1vw]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02, delayChildren: 0.5 } } }}
        initial="hidden"
        animate="show"
      >
        {cards.map((has, i) => (
          <motion.span
            key={i}
            variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 17 }}
            className={`mx-auto aspect-square w-[2.6vw] max-w-[48px] rounded-full ${has ? 'bg-emerald-400 shadow-[0_0_16px] shadow-emerald-400/50' : 'bg-white/12'}`}
            aria-hidden="true"
          />
        ))}
      </motion.div>

      {/* progress + count */}
      <motion.div
        className="w-full max-w-[52vw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        <div className="flex items-end justify-between px-1">
          <p className="font-mono text-[1.4vw] tabular-nums uppercase text-white/55">
            <span className="text-emerald-400">{Math.round(withCard)}</span> of {board.total} cards on file
          </p>
          <p className="font-mono text-[1.4vw] tabular-nums text-white/35">{Math.round(pct)}%</p>
        </div>
        <div className="mt-[1.2vh] h-[1vh] w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-300"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.3, ease: 'easeOut', delay: 0.4 }}
          />
        </div>
      </motion.div>
    </div>
  )
}

// ── Treasurer's dashboard card: type in the current balance ──────────────────

export function TreasuryBalanceCard({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(initial != null ? String(initial) : '')
  const [saved, setSaved] = useState<number | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function save() {
    const amount = Number(value.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid amount')
      return
    }
    setError(null)
    start(async () => {
      const res = await setBankBalance(amount)
      if (!res.success) setError(res.error)
      else setSaved(amount)
    })
  }

  return (
    <div className="border border-indigo-500/40 bg-bg-light dark:bg-bg-dark">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Bank balance for the TV
        </p>
        <p className="mt-1 font-nunito text-f12 text-muted-light dark:text-muted-dark">
          {saved != null
            ? `Showing ${money(saved)}. Update it before your report.`
            : 'Type the current balance so it shows on the board.'}
        </p>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center border border-border-light focus-within:border-indigo-500 dark:border-border-dark">
            <span className="pl-3 font-sora text-[17px] font-bold text-muted-light dark:text-muted-dark">$</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-2.5 font-sora text-[17px] font-bold text-text-light outline-none dark:text-text-dark"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="shrink-0 bg-indigo-500 px-5 font-sora text-[14px] font-black text-white disabled:opacity-60"
          >
            {pending ? 'Saving' : 'Save'}
          </button>
        </div>
        {error && <p className="mt-2 font-nunito text-f12 text-red-500">{error}</p>}
      </div>
    </div>
  )
}

// ── Treasurer's dashboard: add/remove obligations live (pushes to the TV) ─────

export function ObligationsCard() {
  const [items, setItems] = useState<TreasuryObligationItem[]>([])
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    getTreasurerBoard().then((res) => res.success && setItems(res.data.obligations))
  }, [])

  function add() {
    const amt = Number(amount.replace(/[^0-9.]/g, ''))
    if (!label.trim()) return setError('Add a label')
    if (!Number.isFinite(amt) || amt < 0) return setError('Enter a valid amount')
    setError(null)
    start(async () => {
      const res = await addObligation(label.trim(), amt, due ? new Date(due).toISOString() : null)
      if (!res.success) return setError(res.error)
      setItems((prev) => [...prev, res.data])
      setLabel('')
      setAmount('')
      setDue('')
    })
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((o) => o.id !== id)) // optimistic
    start(async () => {
      const res = await removeObligation(id)
      if (!res.success) setError(res.error)
    })
  }

  const total = items.reduce((s, o) => s + o.amount, 0)

  return (
    <div className="border border-indigo-500/40 bg-bg-light dark:bg-bg-dark">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Obligations{' '}
          {items.length > 0 && <span className="text-muted-light dark:text-muted-dark">· {money(total)}</span>}
        </p>
        <p className="mt-1 font-nunito text-f12 text-muted-light dark:text-muted-dark">
          Money the chapter owes. Shows on the board live.
        </p>

        {items.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-border-light dark:divide-border-dark">
            {items.map((o) => (
              <li key={o.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate font-nunito text-f13 text-text-light dark:text-text-dark">
                  {o.label}
                </span>
                {o.dueDate && (
                  <span className="font-mono text-f11 text-muted-light dark:text-muted-dark">{fmtDate(o.dueDate)}</span>
                )}
                <span className="font-sora text-f13 font-bold tabular-nums text-text-light dark:text-text-dark">
                  {money(o.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  aria-label={`Remove ${o.label}`}
                  className="shrink-0 text-muted-light hover:text-red-500 dark:text-muted-dark"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What for (e.g. holiday party deposit)"
            className="border border-border-light bg-transparent px-3 py-2.5 font-nunito text-f13 text-text-light outline-none focus:border-indigo-500 dark:border-border-dark dark:text-text-dark"
          />
          <div className="flex gap-2">
            <div className="flex flex-1 items-center border border-border-light focus-within:border-indigo-500 dark:border-border-dark">
              <span className="pl-3 font-sora text-f13 font-bold text-muted-light dark:text-muted-dark">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-2.5 font-sora text-f13 font-bold text-text-light outline-none dark:text-text-dark"
              />
            </div>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="border border-border-light bg-transparent px-3 py-2.5 font-nunito text-f12 text-text-light outline-none [color-scheme:light] focus:border-indigo-500 dark:border-border-dark dark:text-text-dark dark:[color-scheme:dark]"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending}
              className="flex shrink-0 items-center gap-1 bg-indigo-500 px-4 font-sora text-f13 font-black text-white disabled:opacity-60"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
        {error && <p className="mt-2 font-nunito text-f12 text-red-500">{error}</p>}
      </div>
    </div>
  )
}

// ── Treasurer's PRIVATE roster: who still needs a card (names visible) ────────

export function TreasurerRoster() {
  const [board, setBoard] = useState<TreasurerBoard | null>(null)

  useEffect(() => {
    getTreasurerBoard().then((res) => res.success && setBoard(res.data))
  }, [])

  if (!board) return null
  const missing = board.members.filter((m) => !m.hasCard)

  return (
    <div className="border border-indigo-500/40 bg-bg-light dark:bg-bg-dark">
      <div className="px-4 pt-4 pb-3">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-indigo-500">Treasurer · private</p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          Needs a card ({missing.length} of {board.total})
        </p>
        {missing.length === 0 ? (
          <p className="mt-2 font-nunito text-f12 text-emerald-600 dark:text-emerald-400">
            Everyone has a card on file.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {missing.map((m) => (
              <li key={m.id} className="font-nunito text-f13 text-text-light dark:text-text-dark">
                {m.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
