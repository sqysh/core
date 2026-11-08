'use client'

// Shown on the dashboard of whoever is next in the presenter queue. Upload a
// PDF or an MP4, optional notes for their phone, done. The file goes straight
// to Firebase Storage from the browser (same as profile photos), then we save
// the URL.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Film, Trash2, Upload } from 'lucide-react'
import { ActionBody } from '@/components/_shared/LinkBody'
import { MAX_UPLOAD_MB, StagePresentation } from '@/lib/constants/stage.constants'
import { PresentationKind } from '@/src/generated/prisma/enums'
import uploadFileToFirebase from '@/lib/utils/firebase/uploadFileToFirebase'
import { savePresentation } from '@/lib/actions/presentation/savePresentation'
import { deleteMyPresentation } from '@/lib/actions/presentation/deleteMyPresentation'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark'

async function countPdfPages(file: File): Promise<number | undefined> {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    return doc.numPages
  } catch {
    return undefined
  }
}

export default function PresentationUploadCard({
  meetingDateLabel,
  existing
}: {
  meetingDateLabel: string // "Thursday, November 12"
  existing: StagePresentation | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function onPick(file: File | undefined) {
    if (!file) return
    const kind: PresentationKind | null =
      file.type === 'application/pdf' ? 'SLIDES' : file.type.startsWith('video/') ? 'VIDEO' : null
    if (!kind) {
      setError('PDF for slides, or an MP4 for video.')
      setStatus('error')
      return
    }
    if (file.size > MAX_UPLOAD_MB[kind] * 1024 * 1024) {
      setError(`Keep it under ${MAX_UPLOAD_MB[kind]} MB.`)
      setStatus('error')
      return
    }

    setError('')
    setStatus('uploading')
    try {
      const url = await uploadFileToFirebase(file, setProgress, 'image')
      setStatus('saving')
      const pageCount = kind === 'SLIDES' ? await countPdfPages(file) : undefined
      const res = await savePresentation({
        kind,
        fileUrl: url,
        fileName: file.name,
        pageCount,
        notes: notes || undefined
      })
      if (!res.success) throw new Error(res.error)
      setStatus('idle')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
      setStatus('error')
    }
  }

  async function remove() {
    setStatus('saving')
    await deleteMyPresentation()
    setStatus('idle')
    router.refresh()
  }

  const busy = status === 'uploading' || status === 'saving'

  return (
    <div className="border border-border-light dark:border-border-dark">
      <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
        <p className="text-f10 font-mono tracking-[0.12em] uppercase text-primary-light dark:text-primary-dark">
          You’re presenting
        </p>
        <p className="mt-1 font-sora text-[18px] font-black tracking-tight text-text-light dark:text-text-dark">
          {meetingDateLabel}
        </p>
      </div>

      <div className="px-4 py-4">
        {existing ? (
          <div className="flex items-center gap-3 border border-border-light px-3 py-3 dark:border-border-dark">
            {existing.kind === 'VIDEO' ? (
              <Film size={20} className="shrink-0 text-primary-light dark:text-primary-dark" aria-hidden="true" />
            ) : (
              <FileText size={20} className="shrink-0 text-primary-light dark:text-primary-dark" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-sora text-[14px] font-semibold text-text-light dark:text-text-dark">
                {existing.fileName}
              </p>
              <p className="font-mono text-[12px] text-muted-light dark:text-muted-dark">
                {existing.kind === 'VIDEO' ? 'Video' : `${existing.pageCount ?? '?'} slides`} · ready for Thursday
              </p>
            </div>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Remove"
              className={`flex h-11 w-11 items-center justify-center text-muted-light hover:text-red-600 dark:text-muted-dark ${FOCUS}`}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="font-nunito text-[14px] leading-relaxed text-muted-light dark:text-muted-dark">
            Upload your slides as a PDF, or a video as an MP4, and you’ll run them from your phone on Thursday. No
            laptop, no cable.
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`mt-3 flex h-12 w-full items-center justify-center gap-2 border border-border-light font-sora text-[14px] font-bold text-text-light hover:border-primary-light hover:text-primary-light disabled:opacity-50 dark:border-border-dark dark:text-text-dark dark:hover:border-primary-dark dark:hover:text-primary-dark ${FOCUS}`}
        >
          <ActionBody
            pending={busy}
            icon={<Upload size={16} aria-hidden="true" />}
            label={
              status === 'uploading'
                ? `Uploading ${progress}%`
                : status === 'saving'
                  ? 'Saving…'
                  : existing
                    ? 'Replace file'
                    : 'Upload slides or video'
            }
          />
        </button>

        <label className="mt-4 block">
          <span className="text-f10 font-mono tracking-[0.12em] uppercase text-muted-light dark:text-muted-dark">
            Notes for your phone (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() =>
              existing &&
              savePresentation({
                kind: existing.kind,
                fileUrl: existing.fileUrl,
                fileName: existing.fileName,
                pageCount: existing.pageCount ?? undefined,
                notes
              })
            }
            rows={3}
            placeholder="Only you see these, next to your slides."
            className={`mt-1 w-full border border-border-light bg-bg-light px-3 py-2 font-nunito text-[14px] text-text-light dark:border-border-dark dark:bg-bg-dark dark:text-text-dark ${FOCUS}`}
          />
        </label>

        <p className="mt-3 font-nunito text-[12px] leading-relaxed text-muted-light dark:text-muted-dark">
          PDF only for slides: PowerPoint, Keynote and Google Slides all export to PDF. Animations don’t survive the
          export. Need something live? Bring a cable.
        </p>

        {status === 'error' && (
          <p className="mt-2 font-nunito text-[13px] text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
