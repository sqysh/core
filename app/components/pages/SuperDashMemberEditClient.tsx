'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, Check, AlertCircle } from 'lucide-react'
import { Switch } from '@/app/components/ui/Switch'
import { SuperMemberEditData } from '@/app/lib/actions/user/getUserById'
import uploadFileToFirebase from '@/app/lib/utils/firebase/uploadFileToFirebase'
import { updateMember } from '@/app/lib/actions/user/updateMember'
import { MembershipStatus } from '@/types/user.types'
import { SuperDashStatusBadge } from '../super-dash/SuperDashStatusBadge'
import { deleteUser } from '@/app/lib/actions/user/deleteUser'
import { getInitials } from '@/app/lib/utils/shared.utils'
import { UserRole } from '@prisma/client'

// ─── Constants ─────────────────────────────────────────────────────────────────
const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED'] as const

const inputCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none disabled:opacity-50'

const selectCls =
  'w-full h-12 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark px-3.5 font-nunito text-[15px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none appearance-none cursor-pointer'

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function SuperDashMemberEditClient({ member }: { member: SuperMemberEditData }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'meetings' | 'referrals' | 'closed'>('meetings')
  const [form, setForm] = useState(member)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(member.profileImage)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteUser(member.id)
    setDeleting(false)
    if (res.success) router.push('/super')
  }

  const initials = getInitials(form.name)

  function set<K extends keyof SuperMemberEditData>(key: K, value: SuperMemberEditData[K]) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ── Image upload ──────────────────────────────────────────────────────────────
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to Firebase
    setUploading(true)
    setUploadProgress(0)
    try {
      const url = await uploadFileToFirebase(file, (p) => setUploadProgress(p), 'image')
      setForm((prev) => ({ ...prev, profileImage: url, profileImageFilename: file.name }))
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
    setForm((prev) => ({ ...prev, profileImage: null, profileImageFilename: null }))
    if (fileRef.current) fileRef.current.value = ''
    setSaved(false)
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setError(null)

    const res = await updateMember(member.id, {
      name: form.name,
      phone: form.phone,
      company: form.company,
      secondaryEmail: form.secondaryEmail,
      title: form.title,
      isPublic: form.isPublic,
      role: form.role,
      isMembership: form.isMembership,
      membershipStatus: form.membershipStatus as MembershipStatus,
      profileImage: form.profileImage,
      profileImageFilename: form.profileImageFilename,
      yearsInBusiness: form.yearsInBusiness
    })
    setSaving(false)
    if (!res.success) return setError(res.error ?? 'Something went wrong.')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <div className="max-w-170 mx-auto px-4 pb-24">
        {/* ── Header ── */}
        <div className="pt-7 pb-6 border-b border-border-light dark:border-border-dark mb-6">
          <Link
            href="/super"
            className="inline-flex items-center gap-1.5 text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors mb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back
          </Link>

          <div className="flex items-center gap-4">
            {/* avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 flex items-center justify-center overflow-hidden">
                {preview ? (
                  <img src={preview} alt={form.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-sora font-black text-lg text-primary-light dark:text-primary-dark">
                    {initials}
                  </span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-bg-light/80 dark:bg-bg-dark/80 flex items-center justify-center">
                  <span className="text-f10 font-mono text-primary-light dark:text-primary-dark">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
              )}
            </div>

            <div>
              <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-0.5">
                Edit Member
              </p>
              <h1 className="font-sora font-black text-[22px] text-text-light dark:text-text-dark tracking-tight leading-none">
                {form.name}
              </h1>
              <p className="text-[12.5px] font-nunito text-muted-light dark:text-muted-dark mt-0.5">{form.email}</p>
            </div>
          </div>
        </div>

        {/* ── Profile image ── */}
        <div className="mb-8">
          <p className="text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-3">
            Profile Image
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
              id="profile-image-upload"
              disabled={uploading}
            />
            <label
              htmlFor="profile-image-upload"
              className={`flex items-center gap-2 h-10 px-4 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:border-primary-light dark:hover:border-primary-dark hover:text-primary-light dark:hover:text-primary-dark transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-primary-light dark:focus-within:ring-primary-dark ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload size={13} aria-hidden="true" />
              {uploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload Photo'}
            </label>

            {/* progress bar */}
            {uploading && (
              <div className="flex-1 h-1 bg-border-light dark:bg-border-dark">
                <motion.div
                  className="h-full bg-primary-light dark:bg-primary-dark"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}

            {preview && !uploading && (
              <button
                onClick={removeImage}
                className="flex items-center gap-1.5 h-10 px-3 border border-red-200 dark:border-red-400/20 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/5 transition-colors text-f10 font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <X size={11} aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
        </div>

        {/* ── Fields ── */}
        <div className="flex flex-col gap-5 mb-8">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-5">
            <Field label="Full Name" htmlFor="name">
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value || null)}
                className={inputCls}
                placeholder="(555) 000-0000"
                autoComplete="tel"
              />
            </Field>
          </div>

          <Field label="Gmail Sign-In" htmlFor="secondaryEmail">
            <div className="flex items-stretch">
              <input
                id="secondaryEmail"
                type="text"
                value={(form.secondaryEmail ?? '').replace('@gmail.com', '')}
                onChange={(e) => {
                  const val = e.target.value.replace(/[@\s]/g, '')
                  set('secondaryEmail', val ? `${val}@gmail.com` : '')
                }}
                placeholder="yourusername"
                autoCapitalize="off"
                spellCheck={false}
                className={`${inputCls} flex-1 border-r-0`}
              />
              <div className="h-12 px-3.5 flex items-center bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-border-dark font-mono text-[13px] text-muted-light dark:text-muted-dark select-none whitespace-nowrap">
                @gmail.com
              </div>
            </div>
            {form.secondaryEmail && (
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1.5">
                Sign in with: {form.secondaryEmail}
              </p>
            )}
          </Field>

          <Field label="Company" htmlFor="company">
            <input
              id="company"
              type="text"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Years In Business" htmlFor="yearsInBusiness">
            <input
              id="yearsInBusiness"
              type="text"
              value={form.yearsInBusiness ?? ''}
              onChange={(e) => set('yearsInBusiness', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Membership Status" htmlFor="membershipStatus">
            <div className="relative">
              <select
                id="membershipStatus"
                value={form.membershipStatus}
                onChange={(e) => set('membershipStatus', e.target.value)}
                className={selectCls}
              >
                {MEMBERSHIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <div className="flex flex-col gap-2">
            <div className="border border-border-light dark:border-border-dark px-4 py-3.5">
              <Switch
                name="isPublic"
                checked={form.isPublic ?? false}
                onChange={() => set('isPublic', !form.isPublic)}
                label="Public Profile"
                description={
                  form.isPublic
                    ? 'Your profile is visible on the public member directory'
                    : 'Your profile is hidden from the public member directory'
                }
              />
            </div>

            <div className="border border-border-light dark:border-border-dark px-4 py-3.5">
              <label
                htmlFor="role"
                className="block text-f10 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark mb-2"
              >
                Role
              </label>
              <select
                id="role"
                name="role"
                value={form.role ?? 'MEMBER'}
                onChange={(e) => set('role', e.target.value as UserRole)}
                className="w-full h-11 px-3 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark font-nunito text-[14px] text-text-light dark:text-text-dark focus:outline-none focus:border-primary-light dark:focus:border-primary-dark transition-colors rounded-none appearance-none cursor-pointer"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-2">
                {form.role === 'ADMIN'
                  ? 'This member can manage chapter settings and members'
                  : 'This member does not have admin privileges'}
              </p>
            </div>

            <div className="border border-border-light dark:border-border-dark px-4 py-3.5">
              <Switch
                name="isMembership"
                checked={form.isMembership ?? false}
                onChange={() => set('isMembership', !form.isMembership)}
                label="Membership Role"
                description={
                  form.isMembership
                    ? 'This member handles membership and billing inquiries'
                    : 'This member does not have a membership role'
                }
              />
            </div>
          </div>
        </div>

        {/* ── Activity History ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="block w-5 h-px bg-primary-light dark:bg-primary-dark shrink-0" aria-hidden="true" />
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark">
              Activity History
            </p>
          </div>

          {/* tabs */}
          <div className="flex border-b border-border-light dark:border-border-dark mb-4">
            {(['meetings', 'referrals', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-9 px-4 text-f10 font-mono tracking-[0.15em] uppercase border-b-2 transition-colors focus-visible:outline-none ${
                  activeTab === tab
                    ? 'border-primary-light dark:border-primary-dark text-primary-light dark:text-primary-dark'
                    : 'border-transparent text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                {tab === 'meetings'
                  ? `Meetings (${member.activity.face2face.length})`
                  : tab === 'referrals'
                    ? `Referrals (${member.activity.referrals.length})`
                    : `Closed (${member.activity.tyfcb.length})`}
              </button>
            ))}
          </div>

          {/* meetings */}
          {activeTab === 'meetings' && (
            <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {member.activity.face2face.length === 0 && (
                <p className="px-4 py-5 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
                  No meetings yet
                </p>
              )}
              {member.activity.face2face.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark">
                      {p.requesterId === member.id ? p.recipient.name : p.requester.name}
                    </p>
                    <p className="text-f10 font-mono text-muted-light dark:text-muted-dark">
                      {new Date(p.scheduledAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <SuperDashStatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}

          {/* referrals */}
          {activeTab === 'referrals' && (
            <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {member.activity.referrals.length === 0 && (
                <p className="px-4 py-5 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
                  No referrals yet
                </p>
              )}
              {member.activity.referrals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-secondary-dark shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sora font-bold text-text-light dark:text-text-dark truncate">
                      {r.giverId === member.id ? `→ ${r.receiver.name}` : `← ${r.giver.name}`}
                    </p>
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {r.clientName} · {r.serviceNeeded}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <SuperDashStatusBadge status={r.status} />
                    <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* closed business */}
          {activeTab === 'closed' && (
            <div className="border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {member.activity.tyfcb.length === 0 && (
                <p className="px-4 py-5 text-[12.5px] font-nunito text-muted-light dark:text-muted-dark text-center">
                  No closed business yet
                </p>
              )}
              {member.activity.tyfcb.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-[#34d399] shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-sora font-bold text-primary-light dark:text-primary-dark tabular-nums">
                      ${a.businessValue.toLocaleString()}
                    </p>
                    <p className="text-[11.5px] font-nunito text-muted-light dark:text-muted-dark truncate">
                      {a.giverId === member.id ? `→ ${a.receiver?.name}` : `← ${a.giver?.name}`}
                      {' · '}
                      {a.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <SuperDashStatusBadge status={a.status} />
                    <p className="text-f10 font-mono text-muted-light dark:text-muted-dark mt-1">
                      {new Date(a.closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="mb-8 border border-red-200 dark:border-red-400/20">
          <div className="px-4 py-3 border-b border-red-200 dark:border-red-400/20 bg-red-50 dark:bg-red-400/5">
            <p className="text-f10 font-mono tracking-[0.2em] uppercase text-red-500 dark:text-red-400">Danger Zone</p>
          </div>
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark mb-0.5">
                Delete this member
              </p>
              <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark">
                Permanently removes the user and all associated data. This cannot be undone.
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-9 px-4 bg-red-500 dark:bg-red-600 text-white font-sora font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="h-9 px-4 border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="shrink-0 h-9 px-4 border border-red-200 dark:border-red-400/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/5 transition-colors text-f10 font-mono tracking-[0.15em] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Delete
              </button>
            )}
          </div>
        </div>

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
            <Link
              href="/super"
              className="h-11 px-5 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-sm hover:bg-surface-light dark:hover:bg-surface-dark transition-colors inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="h-11 px-8 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-sm tracking-wide hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
