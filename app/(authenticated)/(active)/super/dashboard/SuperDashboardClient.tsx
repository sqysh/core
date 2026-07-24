'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface RevenueBlock {
  total: number
  annual: number
  quarterly: number
  ytd: number
  qtd: number
  count: number
}

interface MonthPoint {
  month: string
  revenue: number
  annual: number
  quarterly: number
}

interface MemberRevenue {
  id: string
  name: string
  company: string
  hasSavedCard: boolean
  hasAnnual: boolean
  hasQuarterly: boolean
  totalPaid: number
  annualPaid: number
  quarterlyPaid: number
}

interface Stats {
  activeMembers: number
  mrr: number
  arr: number
  active: RevenueBlock
  scheduled: RevenueBlock
  incomplete: RevenueBlock
  combined: RevenueBlock
  monthlyRevenue: MonthPoint[]
  memberRevenue: MemberRevenue[]
  annualCount: number
  quarterlyCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtK(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return fmt(n)
}

const PIE_COLORS = ['#0284c7', '#38bdf8']

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className={`border p-4 flex flex-col gap-1 ${
        accent
          ? 'border-primary-light/30 dark:border-primary-dark/30 bg-primary-light/5 dark:bg-primary-dark/5'
          : 'border-border-light dark:border-border-dark'
      }`}
    >
      <p className="text-[9.5px] font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark">
        {label}
      </p>
      <p
        className={`font-sora font-black text-[24px] tracking-tight leading-none ${
          accent ? 'text-primary-light dark:text-primary-dark' : 'text-text-light dark:text-text-dark'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-3">
      <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" />
      <p className="text-[9.5px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
        {children}
      </p>
    </div>
  )
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark px-3 py-2 text-[11px] font-mono">
      <p className="text-muted-light dark:text-muted-dark mb-1 tracking-widest uppercase">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }} className="tabular-nums">
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SuperDashboardClient({ stats }: { stats: Stats }) {
  const now = new Date()
  const quarter = ['Q1', 'Q2', 'Q3', 'Q4'][Math.floor(now.getMonth() / 3)]
  const year = now.getFullYear()

  const pieData = [
    { name: 'Annual', value: stats.active.annual },
    { name: 'Quarterly', value: stats.active.quarterly }
  ]

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Dashboard
          </h1>
        </div>
        <span className="text-[11px] font-mono text-on-dark">
          {quarter} · {year}
        </span>
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="MRR" value={fmt(stats.mrr)} sub="Active subscriptions" accent />
        <StatCard label="ARR" value={fmt(stats.arr)} sub="Annualized" accent />
        <StatCard label="Active Revenue" value={fmt(stats.active.total)} sub={`${stats.active.count} orders`} />
        <StatCard
          label="Active Members"
          value={stats.activeMembers.toString()}
          sub={`${stats.annualCount} annual · ${stats.quarterlyCount} quarterly`}
        />
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <StatCard label="YTD Revenue" value={fmt(stats.active.ytd)} sub={`Active · ${year}`} />
        <StatCard label={`${quarter} Revenue`} value={fmt(stats.active.qtd)} sub="Active orders" />
        <StatCard label="Incomplete" value={fmt(stats.incomplete.total)} sub={`${stats.incomplete.count} orders`} />
      </div>

      {/* ── Monthly revenue chart + pie ── */}
      <SectionHead>Revenue · {year}</SectionHead>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Bar chart */}
        <div className="border border-border-light dark:border-border-dark p-4">
          <p className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-4">
            Monthly Revenue
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyRevenue} barSize={14} barGap={3}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'currentColor' }}
                tickLine={false}
                axisLine={false}
                className="text-muted-light dark:text-muted-dark"
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'currentColor' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtK}
                className="text-muted-light dark:text-muted-dark"
                width={40}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="annual" name="Annual" fill="#0284c7" radius={[2, 2, 0, 0]} />
              <Bar dataKey="quarterly" name="Quarterly" fill="#38bdf8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="border border-border-light dark:border-border-dark p-4 flex flex-col">
          <p className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-4">
            Active · Annual vs Quarterly
          </p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{
                    border: '1px solid var(--border)',
                    borderRadius: 0,
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}
                />
                <Legend
                  iconType="square"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border-light dark:border-border-dark pt-3">
            <div>
              <p className="text-[9px] font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
                Annual
              </p>
              <p className="font-sora font-black text-[15px] text-primary-light dark:text-primary-dark">
                {fmt(stats.active.annual)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">
                Quarterly
              </p>
              <p className="font-sora font-black text-[15px] text-primary-light dark:text-primary-dark">
                {fmt(stats.active.quarterly)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Member revenue table ── */}
      <SectionHead>Member Breakdown</SectionHead>
      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        {/* Head */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_60px_60px] gap-4 px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
          {['Member', 'Total Paid', 'Annual', 'Quarterly', 'Card', 'Subs'].map((h) => (
            <span key={h} className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">
              {h}
            </span>
          ))}
        </div>

        <div className="divide-y divide-border-light dark:divide-border-dark">
          {stats.memberRevenue.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_60px_60px] gap-4 px-4 py-3 items-center hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            >
              {/* Member */}
              <div className="min-w-0">
                <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark truncate">{m.name}</p>
                <p className="text-[11px] font-mono text-muted-light dark:text-muted-dark truncate">{m.company}</p>
              </div>

              {/* Total */}
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark tabular-nums">
                {m.totalPaid > 0 ? fmt(m.totalPaid) : <span className="text-muted-light dark:text-muted-dark">—</span>}
              </p>

              {/* Annual */}
              <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark tabular-nums">
                {m.annualPaid > 0 ? fmt(m.annualPaid) : '—'}
              </p>

              {/* Quarterly */}
              <p className="text-[12px] font-mono text-muted-light dark:text-muted-dark tabular-nums">
                {m.quarterlyPaid > 0 ? fmt(m.quarterlyPaid) : '—'}
              </p>

              {/* Saved card */}
              <span
                className={`inline-flex items-center justify-center w-5 h-5 text-[9px] font-mono font-bold border ${
                  m.hasSavedCard
                    ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700'
                }`}
              >
                {m.hasSavedCard ? '✓' : '✗'}
              </span>

              {/* Subs */}
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 text-[8px] font-mono font-bold border ${
                    m.hasAnnual
                      ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Annual"
                >
                  A
                </span>
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 text-[8px] font-mono font-bold border ${
                    m.hasQuarterly
                      ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700'
                  }`}
                  title="Quarterly"
                >
                  Q
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
