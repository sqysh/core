'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChapter } from '@/app/lib/actions/chapter/updateChapter'
import { FormField } from '@/app/components/_shared/FormField'
import { inputCls } from '@/app/lib/constants/member/dashboard.constants'

interface Chapter {
  name: string
  location: string
  meetingDay: string
  meetingTime: string
  meetingFrequency: string
  hasUnlockedBooty: boolean
  hasUnlockedGrog: boolean
  hasUnlockedMuster: boolean
}

export function SuperChapterSettingsClient({ chapter }: { chapter: Chapter }) {
  const router = useRouter()
  const [form, setForm] = useState(chapter)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function set<K extends keyof Chapter>(key: K, value: Chapter[K]) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setSaving(true)
    startTransition(async () => {
      const res = await updateChapter(form)
      setSaving(false)
      if (res.success) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="p-6">
      {/* ── Page header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-primary-light dark:text-primary-dark mb-1">
            Super · Admin
          </p>
          <h1 className="font-sora font-black text-[26px] text-text-light dark:text-text-dark tracking-tight">
            Chapter Settings
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-4 bg-primary-light dark:bg-primary-dark text-white font-sora font-bold text-[10px] tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      <div className="border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
          <span className="text-[9.5px] font-mono tracking-[0.15em] uppercase text-on-dark">Meeting Info</span>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 xs:grid-cols-2 gap-3">
          <FormField
            id="name"
            label="Chapter Name"
            className={inputCls}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <FormField
            id="location"
            label="Location"
            className={inputCls}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
          <FormField
            id="meetingDay"
            label="Meeting Day"
            className={inputCls}
            value={form.meetingDay}
            onChange={(e) => set('meetingDay', e.target.value)}
            placeholder="Thursday"
          />
          <FormField
            id="meetingTime"
            label="Meeting Time"
            className={inputCls}
            value={form.meetingTime}
            onChange={(e) => set('meetingTime', e.target.value)}
            placeholder="7:00 AM"
          />
        </div>
      </div>
    </div>
  )
}
