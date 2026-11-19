import { QRCodeSVG } from 'qrcode.react'

// The QR code on a cream card with a navy rope border, to sit in the sky with the harbor log
export function ScanPanel({ url }: { url: string }) {
  return (
    <aside
      className="absolute right-6 top-6 z-20 flex flex-col items-center gap-2 rounded-2xl p-3 shadow-[0_8px_24px_rgba(10,40,90,0.35)]"
      style={{
        background: 'rgba(246,236,210,0.94)',
        border: '3px solid #1d3767',
        boxShadow: 'inset 0 0 0 3px rgba(29,55,103,0.25)'
      }}
    >
      <div className="rounded-lg bg-white p-2.5">
        <QRCodeSVG value={url} size={150} bgColor="#ffffff" fgColor="#1d3767" />
      </div>
      <p className="m-0 font-sora text-[15px] font-black uppercase tracking-[0.18em] text-[#1d3767]">
        Scan to check in
      </p>
    </aside>
  )
}
