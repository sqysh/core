import { FC, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Loader2, Mail } from 'lucide-react'
import { signIn } from 'next-auth/react'

interface ILoginCard {
  isEmailSent: boolean
  handleSubmit: (e: FormEvent) => void
  email: string
  setEmail: (email: string) => void
  isLoading: boolean
  error: string
  setIsEmailSent: (isEmailSent: boolean) => void
  setError: (error: string) => void
  redirectUrl: string
}

export const LoginCard: FC<ILoginCard> = ({
  isEmailSent,
  handleSubmit,
  email,
  setEmail,
  isLoading,
  error,
  setIsEmailSent,
  setError,
  redirectUrl
}) => {
  const handleTryAgain = () => {
    setIsEmailSent(false)
    setEmail('')
    setError('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark p-5 xs:p-8"
    >
      <AnimatePresence mode="wait">
        {!isEmailSent ? (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-5">
              <h2 className="font-sora font-black text-[20px] xs:text-[22px] text-text-light dark:text-text-dark tracking-tight mb-1">
                Sign in
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => signIn('google', { redirectUrl })}
                disabled={isLoading}
                className="w-full h-11 xs:h-12 border border-slate-300 dark:border-border-dark bg-white dark:bg-bg-dark text-text-light dark:text-text-dark font-sora font-bold text-[13px] xs:text-sm flex items-center justify-center gap-3 hover:bg-surface-light dark:hover:bg-surface-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                <span className="text-f10 font-mono tracking-[0.15em] uppercase text-muted-light dark:text-muted-dark">
                  or
                </span>
                <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-f10 font-mono tracking-[0.18em] uppercase text-muted-light dark:text-muted-dark mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark w-4 h-4 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    autoComplete="email"
                    inputMode="email"
                    className="w-full h-11 xs:h-12 pl-10 pr-4 bg-white dark:bg-bg-dark border border-slate-300 dark:border-border-dark font-nunito text-[15px] text-text-light dark:text-text-dark placeholder:text-slate-400 dark:placeholder:text-muted-dark/50 focus:outline-none focus:border-primary-light dark:focus:border-primary-dark focus:ring-1 focus:ring-primary-light/20 dark:focus:ring-primary-dark/20 transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 border-l-2 border-red-500 bg-red-50 dark:bg-red-500/5 px-3 py-2.5"
                >
                  <AlertCircle
                    className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-[12px] font-nunito text-red-600 dark:text-red-400 leading-snug">{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-11 xs:h-12 bg-primary-light dark:bg-button-dark text-white font-sora font-bold text-[13px] xs:text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark focus-visible:ring-offset-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    Send Magic Link
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border-light dark:border-border-dark">
              <p className="text-f10 font-mono tracking-[0.07em] text-muted-light dark:text-muted-dark text-center leading-relaxed">
                Only registered members can access this system.
                <br />
                Contact Sqysh if you need access.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="email-sent"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div className="w-11 h-11 xs:w-12 xs:h-12 flex items-center justify-center bg-primary-light/10 dark:bg-primary-dark/10 border border-primary-light/20 dark:border-primary-dark/20 mx-auto mb-4">
              <Mail className="w-5 h-5 text-primary-light dark:text-primary-dark" aria-hidden="true" />
            </div>

            <h2 className="font-sora font-black text-[20px] xs:text-[22px] text-text-light dark:text-text-dark tracking-tight mb-2">
              Check your email
            </h2>
            <p className="text-[12px] xs:text-[13px] font-nunito text-muted-light dark:text-muted-dark mb-1">
              We've sent a magic link to
            </p>
            <p className="font-mono text-[12px] xs:text-[13px] text-primary-light dark:text-primary-dark font-bold mb-5 truncate px-2">
              {email}
            </p>

            <div className="border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 py-3 mb-5 text-left">
              <p className="text-[12px] font-nunito text-text-light dark:text-text-dark leading-relaxed">
                Click the link in your email to sign in. The link expires in <strong>24 hours</strong>.
              </p>
            </div>

            <button
              onClick={handleTryAgain}
              className="w-full h-11 xs:h-12 border border-slate-300 dark:border-border-dark text-muted-light dark:text-muted-dark font-nunito text-[13px] xs:text-sm hover:bg-surface-light dark:hover:bg-surface-dark hover:text-text-light dark:hover:text-text-dark active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
            >
              Try a different email
            </button>

            <p className="text-f10 font-mono tracking-[0.08em] text-muted-light dark:text-muted-dark mt-4 leading-relaxed">
              Didn't receive it? Check your spam folder.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
