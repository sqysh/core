'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, MapPin, Phone, Mail, ChevronRight, Target } from 'lucide-react'
import { User } from '@/types/user.types'
import FadeUp from '../../../components/_shared/FadeUp'
import { formatPhone } from '@/app/lib/utils/phone.utils'
import { useSession } from 'next-auth/react'
import { getInitials } from '@/app/lib/utils/shared.utils'

// ─── X / Threads icons (lucide doesn't have these) ─────────────────────────────
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.264 5.636 5.9-5.636Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function ThreadsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="currentColor" aria-hidden="true">
      <path d="M141.537 88.988c-.67-.322-1.345-.635-2.028-.937-1.19-11.332-7.15-17.806-16.873-18.575-5.818-.46-11.532 1.782-15.692 6.105l3.45 3.17c2.91-3.091 6.94-4.72 11.101-4.41 6.34.5 10.41 4.29 11.63 11.24-4.15-1.71-8.64-2.44-13.08-2.14-11.46.75-18.92 7.66-18.43 17.4.27 5.31 3.21 9.87 8.18 12.88 4.2 2.56 9.63 3.79 15.3 3.39 7.44-.52 13.31-3.36 17.44-8.44 3.15-3.87 4.96-8.93 5.39-15.06.02-.12.04-.24.05-.36.2-2.38.26-4.87.17-7.43.27-.09.54-.18.82-.26zm-18.91 20.54c-4.11.29-8.42-.84-11.18-2.9-2.29-1.72-3.34-3.9-3.22-6.47.2-3.85 3.67-6.55 9.6-6.95 3.53-.24 6.97.42 10.07 1.91-.38 8.87-2.44 14.04-5.27 14.41z" />
      <path d="M166.28 60.72c-5.35-5.9-12.94-8.94-22.08-8.94a30.68 30.68 0 0 0-3.88.25c-10.26-6.49-23.26-6.37-33.4.33-7.79 5.11-12.56 13.52-12.56 22.72v.49c-8.49 4.7-13.19 12.91-12.7 21.87.33 5.93 2.94 11.49 7.35 15.65 4.35 4.11 10.24 6.38 16.64 6.38 1.63 0 3.28-.16 4.9-.48 3.68 3.81 8.7 5.91 14.18 5.91 10.89 0 19.52-7.97 21.01-18.97 7.81-3.13 12.94-10.55 12.54-18.75-.25-4.99-2.62-9.72-6.55-13.24a22.47 22.47 0 0 0 2.38-5.95c3.32.38 6.37 1.58 8.87 3.52 5.07 3.88 7.91 10.07 7.67 16.77-.07 1.97-.38 3.9-.91 5.77a22.3 22.3 0 0 1 5.74-1.86c.68-2.44 1.03-4.97 1.03-7.54.01-9.63-4.02-17.98-10.33-24.97z" />
    </svg>
  )
}

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function YoutubeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

// ─── Social link ────────────────────────────────────────────────────────────────
function SocialLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark hover:border-primary-light dark:hover:border-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
    >
      <Icon size={14} />
    </a>
  )
}

// ─── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, value, href }: { icon: React.ElementType; value?: string; href?: string }) {
  if (!value) return null
  const content = (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className="text-muted-light dark:text-muted-dark shrink-0" aria-hidden="true" />
      <span className="text-[13px] font-nunito text-text-light dark:text-text-dark">{value}</span>
    </div>
  )
  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary-light dark:hover:text-primary-dark transition-colors"
      >
        {content}
      </a>
    )
  return <div>{content}</div>
}

// ─── Mini member card ──────────────────────────────────────────────────────────
function MiniMemberCard({ member }: { member: User }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/members/${member.id}`)}
      className="group flex items-center gap-3 p-3 border border-border-light dark:border-border-dark hover:border-primary-light dark:hover:border-primary-dark bg-bg-light dark:bg-bg-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
      aria-label={`View ${member.name}'s profile`}
    >
      <div className="w-9 h-9 shrink-0 border border-border-light dark:border-border-dark overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5 flex items-center justify-center">
        {member.profileImage ? (
          <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-f9 font-mono font-bold text-primary-light dark:text-primary-dark">
            {getInitials(member.name)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-sora font-bold text-text-light dark:text-text-dark truncate group-hover:text-primary-light dark:group-hover:text-primary-dark transition-colors">
          {member.name}
        </p>
        <p className="text-f10 font-nunito text-muted-light dark:text-muted-dark truncate">{member.company}</p>
      </div>
      <ChevronRight
        size={12}
        className="text-muted-light dark:text-muted-dark group-hover:text-primary-light dark:group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all shrink-0"
        aria-hidden="true"
      />
    </button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PublicMemberClient({
  user,
  users
}: {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    company: string
    profileImage: string | null
    location: string | null
    bio: string | null
    businessLicenseNumber: string | null
    industry: string | null
    title: string | null
    website: string | null
    yearsInBusiness: string | null
    facebookUrl: string | null
    goal: string | null
    linkedInUrl: string | null
    threadsUrl: string | null
    xUrl: string | null
    youtubeUrl: string | null
    weeklyTreasureWishlist: string | null
  }
  users: User[]
}) {
  const otherMembers = users.filter((m) => m.id !== user.id && m.isPublic)
  const session = useSession()
  const isLoggedIn = session.status === 'authenticated'

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      {/* ── Header ── */}
      <header className="border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark sticky top-0 z-30">
        <div className="max-w-350 mx-auto px-4 xs:px-6 h-12 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-sora font-black text-[18px] tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            aria-label="Coastal Referral Exchange — Home"
          >
            <span className="text-text-light dark:text-text-dark">CORE</span>
            <span className="text-primary-light dark:text-primary-dark">.</span>
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="h-8 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark font-sora font-bold text-[11px] tracking-wide transition-colors inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="h-8 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
                >
                  Profile
                </Link>
              </>
            ) : (
              <Link
                href="/application"
                className="h-8 px-4 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[11px] tracking-wide hover:opacity-90 transition-opacity inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              >
                Apply
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-350 mx-auto px-4 xs:px-6 pb-16">
        {/* ── Back ── */}
        <FadeUp className="pt-7 mb-6">
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            All Members
          </Link>
        </FadeUp>

        <div className="grid grid-cols-1 1000:grid-cols-[320px_1fr] gap-8 1000:gap-12">
          {/* ── LEFT — Avatar + contact ── */}
          <div className="flex flex-col gap-5">
            {/* Avatar */}
            <FadeUp>
              <div className="relative aspect-square w-full max-w-xs mx-auto 1000:max-w-none border border-border-light dark:border-border-dark overflow-hidden bg-primary-light/5 dark:bg-primary-dark/5">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-sora font-black text-[80px] text-primary-light/15 dark:text-primary-dark/15 select-none">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}

                {/* industry tag — color accent */}
                {user.industry && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary-light dark:bg-button-dark px-4 py-2.5">
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-white/80 mb-0.5">Industry</p>
                    <p className="font-sora font-bold text-[13px] text-white leading-tight">{user.industry}</p>
                  </div>
                )}
              </div>
            </FadeUp>

            {/* Contact info */}
            <FadeUp delay={0.06}>
              <div className="border border-border-light dark:border-border-dark">
                <div className="px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                  <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                    Contact
                  </p>
                </div>
                <div className="px-4 py-4 flex flex-col gap-3">
                  <InfoRow icon={Mail} value={user.email} href={`mailto:${user.email}`} />
                  <InfoRow
                    icon={Phone}
                    value={formatPhone(user.phone)}
                    href={`tel:${user.phone?.replace(/\D/g, '')}`}
                  />
                  <InfoRow icon={MapPin} value={user.location} />
                  <InfoRow
                    icon={Globe}
                    value={user.website}
                    href={user.website?.startsWith('http') ? user.website : `https://${user.website}`}
                  />
                </div>
              </div>
            </FadeUp>

            {/* Social links */}
            {(user.linkedInUrl || user.facebookUrl || user.xUrl || user.threadsUrl || user.youtubeUrl) && (
              <FadeUp delay={0.08}>
                <div className="flex items-center gap-2">
                  <SocialLink href={user.linkedInUrl} icon={LinkedInIcon} label="LinkedIn" />
                  <SocialLink href={user.facebookUrl} icon={FacebookIcon} label="Facebook" />
                  <SocialLink href={user.xUrl} icon={XIcon} label="X" />
                  <SocialLink href={user.threadsUrl} icon={ThreadsIcon} label="Threads" />
                  <SocialLink href={user.youtubeUrl} icon={YoutubeIcon} label="YouTube" />
                </div>
              </FadeUp>
            )}
          </div>

          {/* ── RIGHT — Main content ── */}
          <div className="flex flex-col gap-6">
            {/* Name + title */}
            <FadeUp>
              <div className="pb-6 border-b border-border-light dark:border-border-dark">
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-2">
                  Member Profile
                </p>
                <h1 className="font-sora font-black text-[36px] xs:text-[42px] text-text-light dark:text-text-dark tracking-tight leading-none mb-1">
                  {user.name}
                </h1>
                {(user.title || user.company) && (
                  <p className="font-nunito text-[15px] text-muted-light dark:text-muted-dark">
                    {[user.title, user.company].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </FadeUp>

            {/* Weekly referral wishlist — accent section */}
            {user.weeklyTreasureWishlist && (
              <FadeUp delay={0.06}>
                <div className="border-l-[3px] border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5 px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={13} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
                    <p className="text-f10 font-mono tracking-[0.18em] uppercase text-primary-light dark:text-primary-dark">
                      This Week I'm Looking For
                    </p>
                  </div>
                  <p className="font-nunito text-[14px] text-text-light dark:text-text-dark leading-relaxed">
                    {user.weeklyTreasureWishlist}
                  </p>
                </div>
              </FadeUp>
            )}

            {/* Bio */}
            {user.bio && (
              <FadeUp delay={0.08}>
                <div>
                  <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-3">
                    About
                  </p>
                  <p className="font-nunito text-[14.5px] text-text-light dark:text-text-dark leading-relaxed">
                    {user.bio}
                  </p>
                </div>
              </FadeUp>
            )}

            {/* Business details */}
            <FadeUp delay={0.1}>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                {user.yearsInBusiness && (
                  <div className="border border-border-light dark:border-border-dark px-4 py-3">
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1">
                      Experience
                    </p>
                    <p className="font-sora font-black text-[22px] text-primary-light dark:text-primary-dark leading-none">
                      {user.yearsInBusiness}
                      <span className="text-[13px] font-mono font-normal text-muted-light dark:text-muted-dark ml-1">
                        yrs
                      </span>
                    </p>
                  </div>
                )}
                {user.businessLicenseNumber && (
                  <div className="border border-border-light dark:border-border-dark px-4 py-3">
                    <p className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark mb-1">
                      License
                    </p>
                    <p className="font-mono text-[13px] text-text-light dark:text-text-dark">
                      {user.businessLicenseNumber}
                    </p>
                  </div>
                )}
              </div>
            </FadeUp>

            {/* Goal */}
            {user.goal && (
              <FadeUp delay={0.12}>
                <div>
                  <p className="text-f10 font-mono tracking-[0.2em] uppercase text-muted-light dark:text-muted-dark mb-3">
                    Business Goal
                  </p>
                  <p className="font-nunito text-[14.5px] text-text-light dark:text-text-dark leading-relaxed border-l-2 border-border-light dark:border-border-dark pl-4">
                    {user.goal}
                  </p>
                </div>
              </FadeUp>
            )}
          </div>
        </div>

        {/* ── Other members ── */}
        {otherMembers.length > 0 && (
          <FadeUp delay={0.15} className="mt-14">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Other Members
              </p>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 760:grid-cols-3 1000:grid-cols-4 gap-2">
              {otherMembers.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <MiniMemberCard member={m} />
                </motion.div>
              ))}
            </div>
          </FadeUp>
        )}
      </div>
    </div>
  )
}
