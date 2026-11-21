// Haptic feedback through the Vibration API, where the device has it (most Android browsers). Where it doesn't (Safari
// on iPhone has no Vibration API) every call quietly does nothing, so anything that uses this must also show its
// result on screen. No workarounds, no dependencies.

/** Vibration patterns in milliseconds: on, off, on, ... */
export const HAPTIC_PATTERNS = {
  /** A tap: a control was pressed or a small thing changed */
  light: [10],
  /** A step: something was chosen, placed or switched */
  medium: [20],
  /** An impact: something big landed */
  heavy: [40],
  /** It worked: two short pulses, the second a little longer */
  success: [15, 40, 30],
  /** Look at this: three even pulses */
  warning: [30, 60, 30, 60, 30],
  /** It failed: a long buzz, a gap, and a long buzz */
  error: [60, 50, 60]
} as const

export type HapticKind = keyof typeof HAPTIC_PATTERNS

/** Whether this device can vibrate at all */
export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

/** Plays a pattern; false when it couldn't (unsupported, or the browser refused). Never throws. */
export function haptic(kind: HapticKind): boolean {
  if (!hapticsSupported()) return false
  try {
    return navigator.vibrate([...HAPTIC_PATTERNS[kind]])
  } catch {
    return false
  }
}

export const haptics = {
  light: () => haptic('light'),
  medium: () => haptic('medium'),
  heavy: () => haptic('heavy'),
  success: () => haptic('success'),
  warning: () => haptic('warning'),
  error: () => haptic('error')
}
