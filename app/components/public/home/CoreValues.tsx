import { motion } from 'framer-motion'

const fadeInUp: any = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' }
  }
}

const staggerContainer: any = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
}

const waveVariants: any = {
  animate: {
    x: [0, -100],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: 'loop',
        duration: 20,
        ease: 'linear'
      }
    }
  }
}

export default function CoreValues({ coreValues }: { coreValues: any[] }) {
  return (
    <motion.section
      className="py-20 relative overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Animated wave background */}
      <div className="absolute inset-0 opacity-10">
        <motion.div variants={waveVariants} animate="animate" className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 300" className="w-[200%] h-32" preserveAspectRatio="none">
            <path d="M0,160 Q300,100 600,160 T1200,160 Q900,220 600,160 T0,160 Z" fill="rgba(14, 165, 233, 0.1)" />
            <path d="M0,180 Q300,120 600,180 T1200,180 Q900,240 600,180 T0,180 Z" fill="rgba(6, 182, 212, 0.08)" />
            <path d="M0,200 Q300,140 600,200 T1200,200 Q900,260 600,200 T0,200 Z" fill="rgba(8, 145, 178, 0.06)" />
          </svg>
        </motion.div>
      </div>

      {/* Lighthouse beam effect */}
      <div className="absolute top-10 right-10 w-64 h-64 opacity-5">
        <motion.div
          className="w-full h-full bg-gradient-conic from-transparent via-cyan-400/20 to-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(14, 165, 233, 0.2) 45deg, transparent 90deg, transparent 360deg)'
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            {/* Anchor icon */}
            <svg className="w-12 h-12 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a4 4 0 100 8m0-8a4 4 0 110 8m-6 8a2 2 0 002-2v-3a2 2 0 012-2h8a2 2 0 012 2v3a2 2 0 002 2M6 12H4m16 0h-2"
              />
            </svg>
            <h2 className="text-4xl md:text-5xl font-bold text-white">Our Anchors</h2>
          </div>
          <p className="text-xl text-gray-300">The guiding principles that keep us steady in any storm</p>
        </motion.div>

        <motion.div variants={staggerContainer} className="space-y-8">
          {coreValues.map((value: any, index: number) => {
            const isEven = index % 2 === 0
            return (
              <motion.div key={index} variants={fadeInUp} className="group relative">
                <div className={`flex ${isEven ? 'flex-row' : 'flex-row-reverse'} items-center gap-8`}>
                  {/* Content side */}
                  <div className={`flex-1 ${isEven ? 'text-left' : 'text-right'}`}>
                    <motion.div
                      className={`p-8 rounded-2xl backdrop-blur-sm border-2 ${value.color} hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 bg-gradient-to-br from-gray-800/70 to-gray-900/70 relative overflow-hidden`}
                      whileHover={{
                        scale: 1.02,
                        rotateY: isEven ? 2 : -2
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Subtle wave pattern inside card */}
                      <div className={`absolute ${isEven ? 'top-0 right-0' : 'top-0 left-0'} w-24 h-24 opacity-10`}>
                        <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-300">
                          <path d="M0,50 Q25,25 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor" />
                        </svg>
                      </div>

                      {/* Value number as a porthole */}
                      <div
                        className={`absolute ${isEven ? 'top-6 left-6' : 'top-6 right-6'} w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg`}
                      >
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>

                      <div className="relative z-10 pt-8">
                        <h3 className="text-3xl font-bold mb-4 text-white group-hover:text-cyan-100 transition-colors">
                          {value.title}
                        </h3>
                        <p className="text-lg leading-relaxed text-gray-300 group-hover:text-gray-200 transition-colors">
                          {value.description}
                        </p>
                      </div>

                      {/* Decorative rope border */}
                      <div
                        className={`absolute ${isEven ? 'bottom-0 right-0' : 'bottom-0 left-0'} w-full h-2 bg-linear-to-r from-transparent via-amber-600/30 to-transparent`}
                      >
                        <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(245,158,11,0.3)_4px,rgba(245,158,11,0.3)_8px)]"></div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Decorative buoy/marker */}
                  <div className="shrink-0 hidden md:block">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center relative"
                      animate={{
                        y: [0, -8, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    >
                      <div className="w-8 h-8 bg-white rounded-full"></div>
                      {/* Buoy reflection */}
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-linear-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom wave accent */}
        <motion.div variants={fadeInUp} className="mt-20 text-center">
          <div className="inline-flex items-center px-8 py-4 bg-linear-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-full text-cyan-300 font-medium backdrop-blur-sm">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            These values are our North Star in every business relationship
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
