'use client'

import { motion } from 'framer-motion'

export default function SixtySecondsTV() {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f4f6fa] text-[#0f172a]">
      {/* ── News top bar ── */}
      <div className="flex items-stretch h-14 bg-[#1a3558] shrink-0">
        <div className="flex items-center gap-3 px-6 bg-[#2d6fad] shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          <span className="font-mono text-sm tracking-[0.2em] text-white font-bold uppercase">Live</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-xs tracking-[0.18em] uppercase text-blue-300">
            Coastal Referral Exchange · North Shore Chapter · Thursday Morning Meeting
          </span>
        </div>
        <div className="flex items-center pr-6">
          <span className="font-mono text-xs tracking-[0.12em] text-blue-300">60 Seconds</span>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left ── */}
        <div className="flex-1 flex flex-col bg-white border-r-4 border-[#1a3558]">
          <div className="h-2 bg-[#2d6fad] w-full shrink-0" />
          <div className="flex flex-col justify-between flex-1 px-12 py-10">
            {/* Name block */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[#c0392b] text-white font-mono text-[11px] tracking-[0.2em] uppercase font-bold px-3 py-1.5">
                  60 Seconds
                </span>
                <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-slate-400">
                  Presented by Greg Row · Sqysh
                </span>
              </div>
              <h1 className="font-sora font-black text-[88px] leading-none tracking-tight text-[#0f172a]">
                Page Driscoll
              </h1>
              <p className="flex items-center gap-3 font-sora font-bold text-[32px] text-[#2d6fad] mt-3">
                <span className="w-8 h-0.5 bg-[#2d6fad] shrink-0" aria-hidden="true" />
                Commonwealth Payroll &amp; HR
              </p>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Body */}
            <p className="font-nunito text-[22px] text-slate-500 leading-relaxed">
              Payroll processing, HR, time &amp; attendance, benefits administration, and compliance — all under one
              roof. Dedicated experts and real support. They actually pick up the phone.
            </p>

            {/* Refer when */}
            <div className="bg-[#1a3558] px-7 py-6">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-blue-300 mb-4">
                ◆ Refer Page when you hear…
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  '"Payroll is a mess right now."',
                  '"HR is eating too much of my time."',
                  '"We\'re hiring and I don\'t know where to start."',
                  '"We\'re thinking about leaving our PEO."'
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2.5 shrink-0" aria-hidden="true" />
                    <p className="text-[18px] text-slate-200 leading-snug">{line}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400 mb-3">Ideal referral</p>
              <div className="flex flex-wrap gap-2.5">
                {['Small businesses', 'Growing teams', 'Leaving a PEO', 'Any employer with payroll'].map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[11px] tracking-[0.1em] uppercase text-[#1a3558] border border-slate-200 bg-slate-50 px-4 py-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-96 shrink-0 flex flex-col bg-slate-50">
          <div className="bg-[#1a3558] px-5 py-4">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-blue-300">By the numbers</span>
          </div>

          <div className="border-b border-slate-200 px-5 py-6">
            <p className="font-sora font-black text-[52px] text-[#0f172a] leading-none">20</p>
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-slate-400 mt-2">Years in business</p>
          </div>

          <div className="border-b border-slate-200 px-5 py-6">
            <p className="font-sora font-black text-[52px] text-[#0f172a] leading-none">7</p>
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-slate-400 mt-2">Service areas</p>
          </div>

          <div className="border-b border-slate-200 px-5 py-6">
            <p className="font-sora font-bold text-[28px] text-[#2d6fad] leading-none">Marblehead, MA</p>
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-slate-400 mt-2">North Shore local</p>
          </div>

          <div className="border-b border-slate-200 px-5 py-6">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#2d6fad] mb-4">Get in touch</p>
            <div className="flex flex-col gap-3">
              {['877-245-1159', 'sales@commpayhr.com', 'commpayhr.com'].map((val) => (
                <div key={val} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-[#2d6fad] shrink-0" aria-hidden="true" />
                  <p className="font-mono text-[14px] text-slate-500">{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-6 flex-1 flex flex-col justify-end">
            <p className="text-[15px] text-slate-400 leading-relaxed italic">
              "Professional, dependable, and available at a moment's notice."
            </p>
            <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-slate-300 mt-2">— Google Review</p>
          </div>
        </div>
      </div>

      {/* ── Chyron ── */}
      <div className="flex items-stretch h-16 border-t-4 border-[#2d6fad] bg-white shrink-0">
        <div className="flex flex-col justify-center px-5 bg-[#1a3558] border-r-4 border-[#2d6fad] shrink-0 min-w-[200px]">
          <p className="font-sora font-black text-[16px] text-white leading-none">Page Driscoll</p>
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-blue-300 mt-1">
            Commonwealth Payroll &amp; HR
          </p>
        </div>
        <div className="flex-1 overflow-hidden flex items-center">
          <motion.p
            className="font-mono text-[13px] tracking-[0.08em] text-[#1a3558] whitespace-nowrap"
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          >
            ◆ Payroll Processing &nbsp;&nbsp;·&nbsp;&nbsp; HR / People Ops &nbsp;&nbsp;·&nbsp;&nbsp; Benefit
            Administration &nbsp;&nbsp;·&nbsp;&nbsp; Time &amp; Attendance &nbsp;&nbsp;·&nbsp;&nbsp; Compliance
            &nbsp;&nbsp;·&nbsp;&nbsp; Pre-Employment &nbsp;&nbsp;·&nbsp;&nbsp; Staff Augmentation
            &nbsp;&nbsp;·&nbsp;&nbsp; 877-245-1159 &nbsp;&nbsp;·&nbsp;&nbsp; commpayhr.com &nbsp;&nbsp;·&nbsp;&nbsp;
            Marblehead, MA &nbsp;&nbsp;·&nbsp;&nbsp; 20 Years in Business
          </motion.p>
        </div>
        <div className="flex items-center px-5 bg-[#2d6fad] shrink-0">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-white">✦ 60 Seconds</p>
        </div>
      </div>
    </div>
  )
}
