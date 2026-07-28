'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Globe, MapPin, Phone, Mail, Target } from 'lucide-react'
import { User } from '@/types/user.types'
import FadeUp from '../../../../components/_shared/FadeUp'
import { formatPhone } from '@/lib/utils/phone.utils'
import { useSession } from 'next-auth/react'
import { getInitials } from '@/lib/utils/shared.utils'
import SixtySecondsTV from '../_components/SixtySecondsTVClient'
import { FacebookIcon, LinkedInIcon, ThreadsIcon, XIcon, YoutubeIcon } from '@/components/_shared/social-media.icons'
import { InfoRow } from './_components/InfoRow'
import { SocialLink } from './_components/SocialLink'
import { MiniMemberCard } from './_components/MiniMemberCard'

type Props = {
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
}

export default function PublicMemberClient({ user, users }: Props) {
  const otherMembers = users.filter((m) => m.id !== user.id && m.isPublic)
  const session = useSession()
  const isLoggedIn = session.status === 'authenticated'

  if (user.id === 'cmizav9ql000hy0u41tjgqqko') return <SixtySecondsTV />

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
