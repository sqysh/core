'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowRight, ChevronRight } from 'lucide-react'
import { User } from '@/types/user.types'
import FadeUp from '../common/FadeUp'
import Picture from '../common/Picture'

export interface PublicMemberCard {
  id: string
  name: string
  title: string | null
  company: string
  industry: string
  profileImage: string | null
  profileVideo: string | null
  isPublic: boolean
  yearsInBusiness: string | null
}

function MemberCard({ member, index }: { member: PublicMemberCard; index: number }) {
  const router = useRouter()
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.button
      onClick={() => router.push(`/members/${member.id}`)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group w-full text-left border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark bg-bg-light dark:bg-bg-dark transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      aria-label={`View ${member.name}'s profile`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5 border-b border-border-light dark:border-border-dark">
        {member.profileVideo ? (
          <video
            src={member.profileVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : member.profileImage ? (
          <Picture
            priority
            src={member.profileImage}
            alt={member.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-sora font-black text-[52px] text-primary-light/20 dark:text-primary-dark/20 select-none">
              {initials}
            </span>
          </div>
        )}

        {/* industry tag */}
        {member.industry && (
          <div className="absolute top-3 left-3">
            <span className="bg-bg-light/95 dark:bg-bg-dark/95 border border-border-light dark:border-border-dark px-2.5 py-1 text-f9 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
              {member.industry}
            </span>
          </div>
        )}

        {/* years badge */}
        {member.yearsInBusiness && (
          <div className="absolute bottom-3 right-3">
            <span className="bg-primary-light dark:bg-primary-dark text-white px-2.5 py-1 text-f9 font-mono tracking-widest">
              {member.yearsInBusiness} yrs
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-4 pb-5">
        <p className="font-sora font-black text-[17px] text-text-light dark:text-text-dark group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors leading-tight mb-0.5">
          {member.name}
        </p>
        <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark mb-4 truncate">
          {member.company}
        </p>
        <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark pt-3">
          <span className="text-f10 font-mono tracking-[0.15em] uppercase text-primary-light dark:text-primary-dark">
            View Profile
          </span>
          <ChevronRight
            size={14}
            className="text-primary-light dark:text-primary-dark group-hover:translate-x-1 transition-transform duration-200"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export const PublicMembersClient = ({ data }: { data: PublicMemberCard[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('All')

  const publicMembers = data?.filter((m) => m.isPublic) ?? []
  const industries = ['All', ...Array.from(new Set(publicMembers.map((m) => m.industry).filter(Boolean)))]

  const filtered = publicMembers.filter((m) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      (m.title?.toLowerCase().includes(q) ?? false)
    return matchesSearch && (selectedIndustry === 'All' || m.industry === selectedIndustry)
  })

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <header className="border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark sticky top-0 z-30">
        <div className="max-w-350 mx-auto px-4 xs:px-6 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="font-sora font-black text-[18px] tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            aria-label="Coastal Referral Exchange — Home"
          >
            <span className="text-text-light dark:text-text-dark">CORE</span>
            <span className="text-primary-light dark:text-primary-dark">.</span>
          </Link>
          <Link
            href="/application"
            className="h-8 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
          >
            Apply
          </Link>
        </div>
      </header>
      {/* ── Hero ── */}
      <section className="relative border-b border-border-light dark:border-border-dark overflow-hidden">
        {/* subtle grid texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#0284c7 1px, transparent 1px), linear-gradient(to right, #0284c7 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        <div className="relative z-10 max-w-350 mx-auto px-4 xs:px-6 pt-16 pb-14">
          <FadeUp>
            <p className="text-f10 font-mono tracking-[0.25em] uppercase text-primary-light dark:text-primary-dark mb-4">
              Coastal Referral Exchange · North Shore, MA
            </p>
          </FadeUp>

          <FadeUp delay={0.07}>
            <h1 className="font-sora font-black text-[38px] xs:text-[48px] text-text-light dark:text-text-dark tracking-tight leading-[1.05] mb-5 max-w-2xl">
              The people who will send you business.
            </h1>
          </FadeUp>

          <FadeUp delay={0.13}>
            <p className="font-nunito text-[16px] text-muted-light dark:text-muted-dark leading-relaxed max-w-xl mb-8">
              Our members are established professionals across the North Shore who meet every Thursday and actively
              refer business to one another. Every industry represented — one seat per category.
            </p>
          </FadeUp>

          <FadeUp delay={0.18}>
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4">
              <Link
                href="/application"
                className="group inline-flex items-center gap-2 h-12 px-7 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[13px] tracking-wide hover:opacity-90 active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              >
                Apply for Membership
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                  {publicMembers.length} active members
                </span>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <FadeUp delay={0.1}>
        <section className="border-b border-border-light dark:border-border-dark" aria-label="Chapter stats">
          <div className="max-w-350 mx-auto px-4 xs:px-6">
            <div className="grid grid-cols-3 divide-x divide-border-light dark:divide-border-dark">
              {[
                { value: 'Thursdays', label: 'Weekly meetings' },
                { value: '7:00 AM', label: 'Meeting time' },
                { value: '1 seat', label: 'Per industry' }
              ].map(({ value, label }) => (
                <div key={label} className="py-5 px-4 xs:px-6 text-center">
                  <p className="font-sora font-black text-[18px] text-primary-light dark:text-primary-dark leading-none mb-1">
                    {value}
                  </p>
                  <p className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── Member grid ── */}
      <section className="max-w-350 mx-auto px-4 xs:px-6 py-12" aria-label="Member directory">
        {/* Search + filter */}
        <FadeUp className="mb-8">
          <div className="flex flex-col xs:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, company, or title…"
                aria-label="Search members"
                className="w-full h-11 pl-9 pr-3.5 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark font-nunito text-[14px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none"
              />
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              aria-label="Filter by industry"
              className="h-11 px-3.5 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark font-nunito text-[14px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none appearance-none cursor-pointer"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedIndustry !== 'All') && (
            <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-2">
              {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
            </p>
          )}
        </FadeUp>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="border border-border-light dark:border-border-dark px-4 py-12 text-center">
            <p className="font-sora font-bold text-[14px] text-text-light dark:text-text-dark mb-1">No members found</p>
            <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark">
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 769:grid-cols-2 990:grid-cols-3 1336:grid-cols-4 gap-4">
            {filtered.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <FadeUp>
        <section className="border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="max-w-350 mx-auto px-4 xs:px-6 py-14 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-6">
            <div>
              <p className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-tight mb-1">
                Is your industry available?
              </p>
              <p className="text-[13.5px] font-nunito text-muted-light dark:text-muted-dark">
                We protect one seat per industry. Apply now before your category fills.
              </p>
            </div>
            <Link
              href="/application"
              className="group inline-flex items-center gap-2 h-12 px-7 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[13px] tracking-wide hover:opacity-90 active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2 shrink-0"
            >
              Apply Now
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </FadeUp>
    </div>
  )
}
