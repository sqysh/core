import React, { useState, useRef, useCallback, useEffect } from 'react'

const ArcadeLightButton: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false)
  const [lightPosition, setLightPosition] = useState<number>(() => Math.floor(Math.random() * 14))
  const animationFrameRef = useRef<number | null>(null)
  const randomParametersRef = useRef<{
    totalDuration: number
    rotations: number
    easePower: number
    startPosition: number
  }>({
    totalDuration: 0,
    rotations: 0,
    easePower: 0,
    startPosition: 0
  })

  const handleButtonClick = useCallback(() => {
    // If already animating, don't start a new animation
    if (isActive) return

    // Randomize animation parameters
    randomParametersRef.current = {
      totalDuration: 6000 + Math.random() * 2000, // 6-8 seconds
      rotations: 4.5 + Math.random() * 2, // 4.5-6.5 rotations
      easePower: 2 + Math.random() * 1.5, // 2-3.5 easing power
      startPosition: lightPosition // Use current position as start
    }

    setIsActive(true)

    const animate: any = (timestamp: number) => {
      // Store the animation frame reference so we can cancel it later
      animationFrameRef.current = requestAnimationFrame(animate)

      if (!animate.startTime) (animate as any).startTime = timestamp

      const progress = timestamp - (animate as any).startTime

      const { totalDuration, rotations, easePower, startPosition } = randomParametersRef.current

      if (progress >= totalDuration) {
        // Final position
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        // Stop animation
        setIsActive(false)
        return
      }

      // Normalized progress (0 to 1)
      const normalizedProgress = progress / totalDuration

      // Easing function with randomized power to create varied deceleration
      const easedProgress = 1 - Math.pow(1 - normalizedProgress, easePower)
      const totalPositions = 14 * rotations

      // Calculate position based on eased progress
      const newPosition = (startPosition + Math.floor(easedProgress * totalPositions)) % 14

      setLightPosition(newPosition)
    }

    // Start the animation
    requestAnimationFrame(animate)
  }, [isActive, lightPosition])

  // Cleanup function to cancel animation if component unmounts
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="relative flex items-center justify-center w-125 h-125">
        {[...Array(14)].map((_, index) => {
          // Calculate positions around the button
          const angle = (index * Math.PI * 2) / 14
          const radius = 180 // Radius of circle
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`
              }}
              className={`w-10 h-10 rounded-full border-4 border-gray-600 
                ${
                  (isActive && lightPosition === index) || (!isActive && lightPosition === index)
                    ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)]'
                    : 'bg-gray-800'
                }`}
            />
          )
        })}

        {/* Large Press Button */}
        <button
          onClick={handleButtonClick}
          className={`w-72 h-72 rounded-full border-8 absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
            ${
              isActive
                ? 'bg-red-600 border-red-800 cursor-not-allowed'
                : 'bg-red-500 border-red-700 hover:bg-red-600 active:bg-red-700'
            }
            text-white font-bold text-2xl shadow-lg transition-all duration-300 ease-in-out`}
        >
          PRESS
        </button>
      </div>
    </div>
  )
}

export default ArcadeLightButton
