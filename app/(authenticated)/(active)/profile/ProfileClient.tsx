'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  User,
  Briefcase,
  Globe,
  Share2,
  ArrowLeft,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Upload
} from 'lucide-react'
import { ProfileData } from '@/types/user.types'
import { updateProfile } from '@/app/lib/actions/user/updateProfile'
import { formatPhone } from '@/app/lib/utils/phone.utils'
import uploadFileToFirebase from '@/app/lib/utils/firebase/uploadFileToFirebase'
import { getInitials } from '@/app/lib/utils/shared.utils'
import { MemberEmailModal } from '@/app/components/member/dashboard/modals/MemberEmailModal'
import SignInEmailsManager from '@/app/components/member/profile/SignInEmailsManager'
import { SectionHeader } from '@/app/components/member/profile/SectionHeader'
import { FormField } from '@/app/components/_shared/FormField'

const textareaCls =
  'w-full bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 py-3 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none resize-none'

export default function ProfileClient({ profile }: { profile: ProfileData }) {
  const [form, setForm] = useState<ProfileData>(profile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(profile.profileImage)
  const fileRef = useRef<HTMLInputElement>(null)
  const [emailTarget, setEmailTarget] = useState<{ name: string; email: string } | null>(null)
  const [emailBody, setEmailBody] = useState('')
  const [sent, setSent] = useState(false)

  const initials = getInitials(form.name)

  function set(key: keyof ProfileData, value: string | boolean) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ── Image upload ──────────────────────────────────────────────────────────────
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Firebase
    setUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadFileToFirebase(file, (p) => setUploadProgress(p), isVideo ? 'video' : 'image')

      if (isVideo) {
        setForm((prev) => ({
          ...prev,
          profileVideo: url,
          profileVideoFilename: file.name
        }))
      } else {
        setForm((prev) => ({
          ...prev,
          profileImage: url,
          profileImageFilename: file.name
        }))
      }

      setSaved(false)
    } catch {
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function removeImage() {
    setPreview(null)
    setForm((prev) => ({
      ...prev,
      profileImage: null,
      profileImageFilename: null,
      profileVideo: null,
      profileVideoFilename: null
    }))
    if (fileRef.current) fileRef.current.value = ''
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await updateProfile(form)
    setSaving(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      {/* ── Email modal ── */}
      <MemberEmailModal
        emailBody={emailBody}
        emailTarget={emailTarget}
        sent={sent}
        setEmailBody={setEmailBody}
        setSent={setSent}
        setEmailTarget={setEmailTarget}
      />

      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <div className="max-w-170 mx-auto px-4 pb-16">
          {/* ── Header + Profile Image ── */}
          <div className="pt-7 pb-6 border-b border-border-light dark:border-border-dark mb-6">
            {/* top nav */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                <ArrowLeft size={13} />
                Dashboard
              </Link>

              <Link
                href={`/members/${form.id}`}
                className="flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
              >
                View Profile
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="flex items-start gap-4">
              {/* avatar + upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 shrink-0 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center overflow-hidden relative">
                  {form.profileVideo ? (
                    <video
                      src={form.profileVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : preview || form.profileImage ? (
                    <img src={preview || form.profileImage} alt={form.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-sora font-black text-lg text-primary-light dark:text-primary-dark">
                      {initials}
                    </span>
                  )}
                </div>

                {/* hidden input — now accepts video too */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleImageChange}
                  className="sr-only"
                  id="profile-image-upload"
                  disabled={uploading}
                />

                {/* upload button */}
                <label
                  htmlFor="profile-image-upload"
                  className={`flex items-center gap-1.5 text-f10 font-mono tracking-widest uppercase cursor-pointer text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload size={11} />
                  {uploading ? `${Math.round(uploadProgress)}%` : 'Upload'}
                </label>

                {/* remove */}
                {(preview || form.profileImage || form.profileVideo) && !uploading && (
                  <button
                    onClick={removeImage}
                    className="text-[9px] font-mono uppercase tracking-widest text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}

                {/* progress bar */}
                {uploading && (
                  <div className="w-full h-1 bg-border-light dark:bg-border-dark mt-1">
                    <motion.div
                      className="h-full bg-primary-light dark:bg-primary-dark"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                )}
              </div>

              {/* profile info */}
              <div>
                <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-0.5">
                  Your Profile
                </p>
                <h1 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                  {form.name}
                </h1>
                <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">
                  {form.company}
                  {form.title ? ` · ${form.title}` : ''}
                </p>
                <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-0.5">{form.email}</p>
              </div>
            </div>
          </div>

          {/* Display email */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
                Display Email
              </p>
            </div>
            <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark leading-relaxed mb-3">
              Shown on your public profile so prospective clients and members can reach you. Separate from how you sign
              in.
            </p>
            <FormField
              id="email"
              label="Display Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <SignInEmailsManager initialEmails={profile.alternateEmails} primaryEmail={form.email} />

          <div className="flex items-center justify-between px-4 py-3.5 border border-border-light dark:border-border-dark mb-6">
            <div className="flex items-center gap-3">
              {form.isPublic ? (
                <Eye size={14} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
              ) : (
                <EyeOff size={14} className="text-muted-light dark:text-muted-dark" aria-hidden="true" />
              )}
              <div>
                <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
                  {form.isPublic ? 'Public profile' : 'Private profile'}
                </p>
                <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark">
                  {form.isPublic ? 'Visible to the public' : 'Only visible to you'}
                </p>
              </div>
            </div>
            <button
              onClick={() => set('isPublic', !form.isPublic)}
              className={`relative w-11 h-6 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2 ${
                form.isPublic ? 'bg-primary-light dark:bg-primary-dark' : 'bg-slate-300 dark:bg-border-dark'
              }`}
              role="switch"
              aria-checked={form.isPublic}
              aria-label="Toggle profile visibility"
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white transition-transform duration-200 ${
                  form.isPublic ? 'translate-x-0.5' : '-translate-x-4.5'
                }`}
              />
            </button>
          </div>

          {/* ── Personal ── */}
          <section className="mb-8">
            <SectionHeader icon={User} title="Personal Information" />
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
                <FormField
                  id="name"
                  label="Full Name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  autoComplete="name"
                />
                <FormField
                  id="phone"
                  label="Phone"
                  type="tel"
                  optional
                  value={formatPhone(form.phone)}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="7812223333"
                  autoComplete="tel"
                />
              </div>
              <FormField
                id="location"
                label="Location"
                optional
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="City, State"
              />
              <FormField id="bio" label="Bio" optional hint="Tell members a bit about yourself">
                <textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  rows={7}
                  className={textareaCls}
                  placeholder="A few sentences about who you are…"
                />
              </FormField>
              <FormField
                id="weeklyTreasureWishlist"
                label="Weekly Referral Wish"
                optional
                hint="What kind of referrals are you looking for this week?"
                value={form.weeklyTreasureWishlist}
                onChange={(e) => set('weeklyTreasureWishlist', e.target.value)}
                placeholder="e.g. Commercial real estate leads"
              />
              <FormField
                id="goal"
                label="Goal"
                optional
                value={form.goal}
                onChange={(e) => set('goal', e.target.value)}
                placeholder="Your networking goal"
              />
            </div>
          </section>

          {/* ── Business ── */}
          <section className="mb-8">
            <SectionHeader icon={Briefcase} title="Business Information" />
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
                <FormField
                  id="company"
                  label="Business Name"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                />
                <FormField
                  id="industry"
                  label="Industry"
                  value={form.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  placeholder="e.g. Real Estate"
                />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
                <FormField
                  id="title"
                  label="Title"
                  optional
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Owner, Broker"
                />
                <FormField
                  id="yearsInBusiness"
                  label="Years in Business"
                  optional
                  value={form.yearsInBusiness}
                  onChange={(e) => set('yearsInBusiness', e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
              <FormField
                id="businessLicenseNumber"
                label="License Number"
                optional
                value={form.businessLicenseNumber}
                onChange={(e) => set('businessLicenseNumber', e.target.value)}
                placeholder="Professional license number"
              />
            </div>
          </section>

          {/* ── Online ── */}
          <section className="mb-8">
            <SectionHeader icon={Globe} title="Online Presence" />
            <FormField
              id="website"
              label="Website"
              type="url"
              optional
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://yoursite.com"
            />
          </section>

          {/* ── Social ── */}
          <section className="mb-8">
            <SectionHeader icon={Share2} title="Social Media" />
            <div className="flex flex-col gap-5">
              {[
                { key: 'linkedInUrl' as const, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
                { key: 'facebookUrl' as const, label: 'Facebook', placeholder: 'https://facebook.com/you' },
                { key: 'xUrl' as const, label: 'X (Twitter)', placeholder: 'https://x.com/you' },
                { key: 'threadsUrl' as const, label: 'Threads', placeholder: 'https://threads.net/@you' },
                { key: 'youtubeUrl' as const, label: 'YouTube', placeholder: 'https://youtube.com/@you' }
              ].map(({ key, label, placeholder }) => (
                <FormField
                  key={key}
                  id={key}
                  label={label}
                  type="url"
                  optional
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                />
              ))}
            </div>
          </section>

          {/* ── Save bar ── */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-bg-light dark:bg-bg-dark border-t border-border-light dark:border-border-dark px-4 py-3 z-40"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-170 mx-auto flex items-center gap-3">
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center gap-1.5 text-[12px] font-nunito text-red-500 dark:text-red-400"
                    role="alert"
                  >
                    <AlertCircle size={12} aria-hidden="true" />
                    {error}
                  </motion.p>
                )}
                {saved && !error && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center gap-1.5 text-[12px] font-mono text-emerald-600 dark:text-emerald-400"
                  >
                    <Check size={12} aria-hidden="true" />
                    Saved
                  </motion.p>
                )}
                {!error && !saved && <span className="flex-1" />}
              </AnimatePresence>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-11 px-8 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
