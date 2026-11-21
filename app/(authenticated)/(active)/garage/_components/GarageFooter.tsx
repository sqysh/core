'use client'

import { RotateCcw } from 'lucide-react'
import { GlassButton } from '@/components/_shared/LiquidGlass'
import { useGarageContext } from '../_hooks/GarageContext'

/** What just happened, and undo and save */
export function GarageFooter() {
  const { notice, setNotice, storageReady, dirty, busy, saved, setDraft, save } = useGarageContext()
  return (
    <div className="grid gap-2">
      {notice && (
        <p
          role="status"
          className={`m-0 text-center font-nunito text-[12px] ${notice.tone === 'ok' ? 'text-emerald-200' : 'text-red-200'}`}
        >
          {notice.text}
        </p>
      )}
      {!storageReady && (
        <p role="status" className="m-0 text-center font-nunito text-[12px] text-amber-100/90">
          Saving isn’t switched on yet. You can try everything; it won’t be kept.
        </p>
      )}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <GlassButton
          onClick={() => setDraft(saved)}
          disabled={!dirty || !!busy}
          className="h-12 w-12 rounded-2xl"
          aria-label="Undo all changes"
        >
          <RotateCcw size={17} aria-hidden="true" />
        </GlassButton>
        <GlassButton
          tone="primary"
          onClick={async () => {
            if (await save()) setNotice({ tone: 'ok', text: 'Saved. This is the boat that sails in at check-in.' })
          }}
          disabled={!dirty || !!busy || !storageReady}
          className="h-12 text-[14px]"
        >
          {busy === 'save' ? 'Saving…' : dirty ? 'Save boat' : 'Saved'}
        </GlassButton>
      </div>
    </div>
  )
}
