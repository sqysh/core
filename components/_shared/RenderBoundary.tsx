'use client'

import { Component, ReactNode } from 'react'
import { reportError } from '@/lib/utils/reportError'

/**
 * Contains a failure in a 3D scene (a WebGL context the device can't create, a scene that won't load) to the scene
 * itself: it reports the error and shows `fallback` (or nothing), so the rest of the page carries on.
 */
export class RenderBoundary extends Component<
  { label: string; fallback?: ReactNode; onFail?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    reportError(this.props.label, error)
    this.props.onFail?.()
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
