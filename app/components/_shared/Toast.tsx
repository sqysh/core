import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { store, useToastSelector } from '@/app/lib/redux/store'
import { hideToast } from '@/app/lib/redux/slices/toastSlice'

const TOAST_STYLES = {
  success: {
    icon: CheckCircle,
    accent: 'border-l-emerald-400 dark:border-l-emerald-400',
    iconCls: 'text-emerald-600 dark:text-emerald-400'
  },
  error: {
    icon: AlertCircle,
    accent: 'border-l-red-500 dark:border-l-red-400',
    iconCls: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    accent: 'border-l-amber-500 dark:border-l-amber-400',
    iconCls: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    icon: Info,
    accent: 'border-l-primary-light dark:border-l-primary-dark',
    iconCls: 'text-primary-light dark:text-primary-dark'
  }
} as const

const Toast: React.FC = () => {
  const { isVisible, type, message, description, duration } = useToastSelector()

  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(() => store.dispatch(hideToast()), duration)
    return () => clearTimeout(timer)
  }, [isVisible, type, duration])

  if (!isVisible) return null

  const { icon: Icon, accent, iconCls } = TOAST_STYLES[type]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
          className={`fixed top-4 right-4 left-4 lg:left-auto lg:max-w-sm z-200 bg-bg-light dark:bg-surface-dark border border-border-light dark:border-border-dark border-l-2 ${accent} shadow-lg`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3 p-4">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-sora font-bold text-[13px] text-text-light dark:text-text-dark leading-snug">
                {message}
              </p>
              {description && (
                <p className="text-[12px] font-nunito text-muted-light dark:text-muted-dark mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={() => store.dispatch(hideToast())}
              className="text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark rounded-sm"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Toast
