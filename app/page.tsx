'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { GameGeneratorForm } from '@/domains/games/components/game-generator-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { animationConfig } from '@/lib/animations'

const steps = [
  {
    number: '1',
    title: 'Submit Content',
    description: 'Paste a Paragraph.xyz article URL from supported authors',
  },
  {
    number: '2',
    title: 'Customize & Generate',
    description: 'Choose your style, AI model, and creative parameters. Pay with writer coins.',
  },
  {
    number: '3',
    title: 'Play & Mint',
    description: 'Experience your unique game interpretation and mint it as an NFT',
  },
]

function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section className="py-16 px-4" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-3xl font-bold mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          How WritArcade Works
        </motion.h2>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={animationConfig.variants.staggerContainer}
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="text-center"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: index * 0.15, duration: 0.6 },
                },
              }}
            >
              {/* Animated number circle with glow */}
              <motion.div
                className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 relative"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                    '0 0 40px rgba(168, 85, 247, 0.8)',
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                  },
                }}
              >
                <span className="text-2xl font-bold">{step.number}</span>
              </motion.div>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { showOnboarding, dismissOnboarding } = useOnboarding()
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section with animated background */}
        <section className="relative py-20 px-4 overflow-hidden">
          {/* Animated background gradient layers */}
          <div className="absolute inset-0 -z-10">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30"
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Kinetic title - staggered word animation */}
            <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {['WritArcade'].map((word) => (
                <motion.span
                  key={word}
                  className="inline-block"
                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: 'easeOut',
                    type: 'spring',
                    stiffness: 100,
                  }}
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </h1>

            {/* Staggered description */}
            <motion.p
              className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Turn any article into an interactive, mintable game. 
              Pay with writer coins to create your unique interpretation.
            </motion.p>
            
            {/* Game Generator */}
            <motion.div
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <GameGeneratorForm />
            </motion.div>
          </div>
        </section>
        
        {/* Featured Games */}
        <section className="py-16 px-4 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Recently Generated Games
            </h2>
            <Suspense fallback={<div className="text-center">Loading games...</div>}>
              <GameGrid limit={12} />
            </Suspense>
          </div>
        </section>
        
        {/* How it Works - with scroll animations */}
        <HowItWorksSection />

      </main>
      
      <Footer />
      
      <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} />
    </div>
  )
}