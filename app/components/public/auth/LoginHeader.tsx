import { motion } from 'framer-motion'
import Link from 'next/link'

const LoginHeader = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="text-center mb-5 xs:mb-8"
    >
      <Link
        href="/"
        className="inline-flex items-center justify-center mb-3 xs:mb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light dark:focus-visible:ring-primary-dark"
        aria-label="Coastal Referral Exchange — Home"
      >
        <span className="font-sora font-black text-[20px] xs:text-[22px] tracking-tight">
          <span className="text-text-light dark:text-text-dark">CORE</span>
          <span className="text-primary-light dark:text-primary-dark">.</span>
        </span>
      </Link>

      <h1 className="font-sora font-black text-[24px] xs:text-[28px] text-text-light dark:text-text-dark tracking-tight leading-none mb-1.5 xs:mb-2">
        Welcome back.
      </h1>

      <p className="text-[12px] xs:text-[13px] font-nunito text-muted-light dark:text-muted-dark">
        Enter your email and we'll send you a link to sign in.
      </p>
    </motion.div>
  )
}
export default LoginHeader
