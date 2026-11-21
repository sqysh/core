import { ButtonHTMLAttributes, ElementType, HTMLAttributes, ReactNode } from 'react'

// CORE's Liquid Glass: clear, smoked-blue panes that sit over a moving scene (the harbor) and let it show through. A
// soft backdrop blur and saturation, a hairline rim, a specular edge catching the light along the top, and a little
// depth under it. Always light text, so it reads over any water. Use these rather than hand-rolling glass: the class
// strings are exported for places that need a non-button element (a label, a row in a list).
//
// Where the browser can't blur what's behind (older Firefox), the panes fall back to their translucent tint, which
// still reads as glass.

/** A surface: a panel of controls, a menu sheet's column, a floating label */
export const glassPanel =
  "relative overflow-hidden rounded-3xl border border-white/25 bg-[#06101b]/35 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_0_24px_rgba(255,255,255,0.05),0_12px_36px_rgba(4,16,32,0.35)] backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent before:content-['']"

/** A layer above a panel: a readout, a group of controls */
export const glassPane = 'rounded-2xl border border-white/15 bg-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'

const buttonBase =
  'relative inline-flex items-center justify-center gap-2 rounded-2xl border font-sora font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)] backdrop-blur-md transition-[background-color,border-color,transform] duration-150 ease-out [text-shadow:0_1px_3px_rgba(4,16,32,0.5)] hover:-translate-y-px active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

const tones = {
  /** An ordinary control */
  default: 'border-white/25 bg-white/10 hover:border-white/40 hover:bg-white/18 active:bg-white/25',
  /** The one thing to do next */
  primary: 'border-sky-200/50 bg-sky-400/30 hover:border-sky-100/70 hover:bg-sky-400/40 active:bg-sky-400/50',
  /** A control that's switched on (playing, selected) */
  active: 'border-sky-200/50 bg-sky-400/20 text-sky-100 hover:bg-sky-400/30 active:bg-sky-400/40'
}

/** The class string of a glass button, for a link or anything else that isn't a <button> */
export const glassButton = (tone: keyof typeof tones = 'default') => `${buttonBase} ${tones[tone]}`

export function GlassPanel<T extends ElementType = 'div'>({
  as,
  className = '',
  children,
  ...rest
}: { as?: T; className?: string; children?: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  const Tag = (as ?? 'div') as ElementType
  return (
    <Tag className={`${glassPanel} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function GlassButton({
  tone = 'default',
  className = '',
  type = 'button',
  ...rest
}: { tone?: keyof typeof tones } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${glassButton(tone)} ${className}`} {...rest} />
}
