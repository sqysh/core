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
      staggerChildren: 0.2
    }
  }
}

export default function ChartYourCourse({ creValues }: { creValues: any[] }) {
  return (
    <motion.section
      className="py-20 relative"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Subtle coastal background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(14,165,233,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(6,182,212,0.1),transparent_50%)]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            {/* Simple compass/navigation icon */}
            <svg className="w-12 h-12 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 5.447-2.724A1 1 0 0121 3.382v10.764a1 1 0 01-.553.894L15 18l-6-3z"
              />
            </svg>
            <h2 className="text-4xl md:text-5xl font-bold text-white">Chart Your Course</h2>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Navigate your business journey with our proven framework built on six fundamental principles
          </p>
        </motion.div>

        <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creValues.map((value: any, index: number) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group relative p-8 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 border border-gray-600/50 hover:border-cyan-400/40 overflow-hidden"
            >
              {/* Subtle wave pattern overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400">
                  <path
                    d="M0,50 Q25,30 50,50 T100,50 Q75,70 50,50 T0,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M0,60 Q25,40 50,60 T100,60 Q75,80 50,60 T0,60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                </svg>
              </div>

              {/* Navigation number badge */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                {index + 1}
              </div>

              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-r ${value.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg relative z-10`}
              >
                {value.icon}
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 relative z-10 group-hover:text-cyan-100 transition-colors">
                {value.title}
              </h3>

              <p className="text-gray-300 text-lg leading-relaxed relative z-10">{value.description}</p>

              {/* Coastal accent border */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-cyan-400/50 to-transparent group-hover:via-cyan-400/80 transition-all duration-300"></div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to action with nautical theme */}
        <motion.div variants={fadeInUp} className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 bg-linear-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-full text-cyan-300 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Ready to set sail toward success?
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
