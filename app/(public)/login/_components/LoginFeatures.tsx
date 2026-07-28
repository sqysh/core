import { motion } from 'framer-motion'
import { Building2, Shield, Users } from 'lucide-react'

const LoginFeatures = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="mt-4 xs:mt-5 grid grid-cols-3 border border-border-light dark:border-border-dark divide-x divide-border-light dark:divide-border-dark"
    >
      {[
        { icon: Shield, label: 'Secure' },
        { icon: Users, label: 'Members' },
        { icon: Building2, label: 'Chapter' }
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1 xs:gap-1.5 py-2 xs:py-3">
          <Icon size={12} className="text-primary-light dark:text-primary-dark" aria-hidden="true" />
          <p className="text-f9 font-mono tracking-widest uppercase text-muted-light dark:text-muted-dark">{label}</p>
        </div>
      ))}
    </motion.div>
  )
}

export default LoginFeatures
