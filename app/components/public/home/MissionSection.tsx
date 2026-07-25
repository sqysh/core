import React from 'react'
import { motion } from 'framer-motion'
import { fadeInUp } from '../../lib/constants/motion'
import Picture from '../common/Picture'

const MissionSection = () => {
  return (
    <motion.section
      className="py-20 flex flex-col items-center justify-center"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="border border-cyan-400 w-fit rounded-lg p-12 bg-cyan-500/10 flex flex-col items-center justify-center">
        <p className="text-cyan-400 mb-3 text-center">Our Mission</p>
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          Charting the Course for <br />
          Crew and Growth
        </h2>
        <Picture
          src="/images/core-hero.jpg"
          priority={true}
          className="w-full max-w-3xl object-contain rounded-md mb-12"
          alt="Hero background"
        />
        <motion.div variants={fadeInUp} className="text-center max-w-2xl">
          <p className="text-xl text-gray-200 leading-relaxed max-w-4xl mx-auto"></p>
        </motion.div>
      </div>
    </motion.section>
  )
}

export default MissionSection
