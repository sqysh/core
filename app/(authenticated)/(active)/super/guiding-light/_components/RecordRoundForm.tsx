import { useState } from 'react'
import { Member } from '../../../guiding-light/_types/guiding-light.types'
import { recordPastRound } from '@/lib/actions/guiding-light/recordPastRound'
import { motion } from 'framer-motion'

function lastThursday() {
  const d = new Date()
  const diff = (d.getDay() - 4 + 7) % 7 || 7
  d.setDate(d.getDate() - diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FIELD =
  'h-8 w-full px-2 text-[12px] font-mono bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark'

export function RecordRoundForm({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const [date, setDate] = useState(lastThursday())
  const [judgedById, setJudgedById] = useState('')
  const [winnerId, setWinnerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = date && judgedById && winnerId && judgedById !== winnerId

  async function save() {
    setSaving(true)
    setError(null)
    const res = await recordPastRound({ meetingDate: date, judgedById, winnerId })
    setSaving(false)
    if (res.success) onDone()
    else setError(res.error ?? 'Something went wrong')
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mb-4"
    >
      <div className="border border-border-light dark:border-border-dark">
        <div className="px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
          <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
            Record a round you missed
          </span>
        </div>

        <div className="p-4 grid grid-cols-[1fr_2fr_2fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block mb-1 text-[9px] font-mono tracking-[0.15em] uppercase text-on-dark">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </label>

          <label className="block">
            <span className="block mb-1 text-[9px] font-mono tracking-[0.15em] uppercase text-on-dark">Judged by</span>
            <select value={judgedById} onChange={(e) => setJudgedById(e.target.value)} className={FIELD}>
              <option value="">Select</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block mb-1 text-[9px] font-mono tracking-[0.15em] uppercase text-on-dark">Winner</span>
            <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className={FIELD}>
              <option value="">Select</option>
              {members
                .filter((m) => m.id !== judgedById)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>

          <button
            onClick={save}
            disabled={!valid || saving}
            className="h-8 px-4 text-[10px] font-mono tracking-[0.15em] uppercase border border-primary-light/40 dark:border-primary-dark/40 text-primary-light dark:text-primary-dark hover:bg-primary-light/5 dark:hover:bg-primary-dark/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>

        {error && <p className="px-4 pb-4 -mt-1 text-[11px] font-mono text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </motion.div>
  )
}
