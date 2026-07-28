export const drawerVariants = {
  closed: {
    x: '100%',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40
    }
  },
  open: {
    x: '0%',
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40
    }
  }
}

export const overlayVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.3
    }
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }
}

export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export const fadeInUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
}

export const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

export const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  visible: (d = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, easing: [0.16, 1, 0.3, 1], delay: d }
  })
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: (d = 0) => ({
    opacity: 1,
    transition: { duration: 1.0, easing: 'easeOut', delay: d }
  })
}

export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } }
}
