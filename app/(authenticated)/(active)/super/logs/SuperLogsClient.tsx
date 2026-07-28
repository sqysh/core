'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Trash2, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import { fmtDate, timeAgo } from '@/lib/utils/date.utils'
import { getLogs, LogEntry, LogsByLevel } from '@/lib/actions/log/getLogs'
import { deleteLog } from '@/lib/actions/log/deleteLog'
import { clearLogs } from '@/lib/actions/log/clearLogs'

function parseMetadata(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return []
  let m: Record<string, unknown>
  try {
    m = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
  } catch {
    return []
  }

  const lines: string[] = []
  if (Array.isArray(m.location)) lines.push((m.location as string[]).join(' → '))
  if (m.email) lines.push(`Email: ${m.email}`)
  if (m.userId) lines.push(`User: ${m.userId}`)
  if (typeof m.error === 'string') lines.push(`Error: ${m.error}`)

  const inner = m.metadata as Record<string, unknown> | undefined
  if (inner?.clientName) lines.push(`Client: ${inner.clientName}`)
  if (inner?.serviceNeeded) lines.push(`Service: ${inner.serviceNeeded}`)
  if (inner?.treasureMapId) lines.push(`ID: ${inner.treasureMapId}`)
  if (inner?.anchorId) lines.push(`ID: ${inner.anchorId}`)
  if (inner?.parleyId) lines.push(`ID: ${inner.parleyId}`)
  return lines
}

// ─── Level config ──────────────────────────────────────────────────────────────
const LEVELS = {
  error: {
    dot: 'bg-red-500',
    header: 'bg-red-500/10  border-red-200   dark:border-red-400/20',
    label: 'Errors',
    accent: 'border-t-red-500'
  },
  warning: {
    dot: 'bg-amber-400',
    header: 'bg-amber-400/8 border-amber-200 dark:border-amber-400/20',
    label: 'Warnings',
    accent: 'border-t-amber-400'
  },
  info: {
    dot: 'bg-sky-400',
    header: 'bg-sky-400/8   border-sky-200   dark:border-sky-400/20',
    label: 'Info',
    accent: 'border-t-sky-400'
  }
} as const

// ─── Log card ──────────────────────────────────────────────────────────────────
function LogCard({ log, onDelete }: { log: LogEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const parsed = parseMetadata(log.metadata)
  const hasMetadata =
    log.metadata && Object.keys(typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata).length > 0

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteLog(log.id)
    if (res.success) onDelete(log.id)
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="border-b border-border-light dark:border-border-dark last:border-0 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors">
      <div className="px-3 py-3">
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-[12.5px] font-sora font-bold text-text-light dark:text-text-dark leading-snug flex-1 min-w-0">
            {log.message}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {hasMetadata && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-5 h-5 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors focus-visible:outline-none"
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
            {confirming ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-f9 font-mono uppercase text-red-500 dark:text-red-400 px-1.5 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  {deleting ? '…' : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-f9 font-mono uppercase text-muted-light dark:text-muted-dark px-1.5 hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-5 h-5 flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none"
                aria-label="Delete"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Parsed metadata inline ── */}
        {parsed.length > 0 && (
          <div className="flex flex-col gap-0.5 mb-1.5">
            {parsed.map((line, i) => (
              <span key={i} className="text-[10.5px] font-mono text-muted-light dark:text-muted-dark leading-snug">
                {line}
              </span>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center gap-2">
          {log.userName && (
            <span className="text-f9 font-mono text-muted-light dark:text-muted-dark">{log.userName}</span>
          )}
          <span className="text-f9 font-mono text-muted-light dark:text-muted-dark" title={fmtDate(log.createdAt)}>
            {timeAgo(log.createdAt)}
          </span>
        </div>
      </div>

      {/* ── Raw JSON ── */}
      <AnimatePresence>
        {expanded && hasMetadata && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <pre className="text-[10px] font-mono text-text-light dark:text-text-dark bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark px-3 py-2.5 overflow-x-auto leading-relaxed">
              {JSON.stringify(typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Level column ──────────────────────────────────────────────────────────────
function LevelColumn({
  level,
  logs,
  onDelete,
  onClear
}: {
  level: keyof typeof LEVELS
  logs: LogEntry[]
  onDelete: (id: string) => void
  onClear: (level: string) => void
}) {
  const cfg = LEVELS[level]
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleClear() {
    setClearing(true)

    const res = await clearLogs(level)
    if (res.success) onClear(level)
    setClearing(false)
    setConfirmClear(false)
  }

  return (
    <div
      className={`flex flex-col border border-border-light dark:border-border-dark border-t-2 ${cfg.accent} min-h-0`}
    >
      {/* column header */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 border-b border-border-light dark:border-border-dark ${cfg.header} shrink-0`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} aria-hidden="true" />
          <p className="text-f10 font-mono tracking-[0.18em] uppercase text-text-light dark:text-text-dark">
            {cfg.label}
          </p>
          <span className="text-f10 font-mono text-muted-light dark:text-muted-dark">{logs.length}</span>
        </div>
        {confirmClear ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-f9 font-mono uppercase text-red-500 dark:text-red-400 px-1.5 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors disabled:opacity-40 h-5"
            >
              {clearing ? '…' : 'Clear'}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-f9 font-mono uppercase text-muted-light dark:text-muted-dark px-1.5 h-5"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-f9 font-mono uppercase tracking-widest text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none"
          >
            Clear
          </button>
        )}
      </div>

      {/* scrollable log list */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {logs.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] font-nunito text-muted-light dark:text-muted-dark">
            No {cfg.label.toLowerCase()}
          </p>
        ) : (
          logs.map((log) => <LogCard key={log.id} log={log} onDelete={onDelete} />)
        )}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function LogsClient({ initialByLevel }: { initialByLevel: LogsByLevel }) {
  const [byLevel, setByLevel] = useState(initialByLevel)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchLogs(opts: { search?: string } = {}) {
    setLoading(true)
    const res = await getLogs({ search: opts.search ?? search })
    setLoading(false)
    if (res.success && res.data) setByLevel(res.data.byLevel)
  }

  function handleDelete(id: string) {
    setByLevel((prev) => ({
      error: prev.error.filter((l) => l.id !== id),
      warning: prev.warning.filter((l) => l.id !== id),
      info: prev.info.filter((l) => l.id !== id),
      debug: prev.debug.filter((l) => l.id !== id)
    }))
  }

  function handleClear(level: string) {
    setByLevel((prev) => ({ ...prev, [level]: [] }))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchLogs({ search })
  }

  const total = Object.values(byLevel).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="p-6">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            System Logs
            <span className="ml-3 text-[16px] font-mono text-muted-light dark:text-muted-dark font-normal">
              {total.toLocaleString()}
            </span>
          </h1>
        </div>

        {/* Search + refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-48 pl-8 pr-3 bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark font-nunito text-[13px] text-text-light dark:text-text-dark placeholder:text-muted-light/50 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    fetchLogs({ search: '' })
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-8 px-3 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors text-[10px] font-mono tracking-[0.15em] uppercase disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Log columns ── */}
      <div className={`grid grid-cols-1 1000:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {(Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((level) => (
          <LevelColumn key={level} level={level} logs={byLevel[level]} onDelete={handleDelete} onClear={handleClear} />
        ))}
      </div>
    </div>
  )
}
