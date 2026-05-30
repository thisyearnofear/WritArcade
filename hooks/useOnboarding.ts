import { useState, useEffect } from 'react'

const ONBOARDING_DISMISSED_KEY = 'writarcade_onboarding_dismissed'
const ONBOARDING_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface TourState {
  showTour: boolean
  currentStep: number
  flowId: string | null
}

export function useOnboarding() {
  const [tour, setTour] = useState<TourState>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
      if (raw) {
        const dismissedAt = Number(raw)
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < ONBOARDING_TTL_MS) {
          return { showTour: false, currentStep: 0, flowId: null }
        }
        // TTL expired — clear and show again
        localStorage.removeItem(ONBOARDING_DISMISSED_KEY)
      }
      return { showTour: false, currentStep: 0, flowId: null }
    }
    return { showTour: false, currentStep: 0, flowId: null }
  })

  const startTour = (flowId: string) => {
    setTour({ showTour: true, currentStep: 0, flowId })
  }

  const nextStep = () => {
    setTour(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
  }

  const prevStep = () => {
    setTour(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }))
  }

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, String(Date.now()))
    setTour({ showTour: false, currentStep: 0, flowId: null })
  }

  return {
    showOnboarding: tour.showTour,
    currentStep: tour.currentStep,
    flowId: tour.flowId,
    startTour,
    nextStep,
    prevStep,
    dismissOnboarding,
  }
}
