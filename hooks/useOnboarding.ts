import { useState, useEffect } from 'react'

const ONBOARDING_DISMISSED_KEY = 'writarcade_onboarding_dismissed'

export interface TourState {
  showTour: boolean
  currentStep: number
  flowId: string | null
}

export function useOnboarding() {
  const [tour, setTour] = useState<TourState>(() => {
    if (typeof window !== 'undefined') {
        const isDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
        if (!isDismissed) {
            return { showTour: true, currentStep: 0, flowId: 'app-intro' }
        }
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
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
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
