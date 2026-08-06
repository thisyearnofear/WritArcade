import { useEffect, useState } from 'react'

const ONBOARDING_DISMISSED_KEY = 'writarcade_onboarding_dismissed'
const ONBOARDING_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface TourState {
  showTour: boolean
  currentStep: number
  flowId: string | null
}

function isDismissed(): boolean {
  const raw = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!isNaN(dismissedAt) && Date.now() - dismissedAt < ONBOARDING_TTL_MS) {
    return true
  }
  // TTL expired — clear and show again
  localStorage.removeItem(ONBOARDING_DISMISSED_KEY)
  return false
}

export function isOnboardingDismissed(): boolean {
  return isDismissed()
}

export function useOnboarding(autoStartFlowId?: string) {
  const [tour, setTour] = useState<TourState>({
    showTour: false,
    currentStep: 0,
    flowId: null,
  })

  useEffect(() => {
    if (autoStartFlowId && !isDismissed()) {
      setTour({ showTour: true, currentStep: 0, flowId: autoStartFlowId })
    }
  }, [autoStartFlowId])

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
