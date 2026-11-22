import { useEffect } from 'react'

/** Keeps the page from scrolling or rubber-banding while it's showing; the page behind is put back on leaving */
export function useLockedPage() {
  useEffect(() => {
    const { documentElement: html, body } = document
    const before = [html.style.overflow, html.style.overscrollBehavior, body.style.overflow]
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    body.style.overflow = 'hidden'
    return () => {
      ;[html.style.overflow, html.style.overscrollBehavior, body.style.overflow] = before
    }
  }, [])
}
