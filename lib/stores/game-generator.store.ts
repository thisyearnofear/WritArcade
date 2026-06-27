import { create } from 'zustand'
import { type GameGenre } from '@/components/game/GenreSelector'
import { type GameDifficulty } from '@/components/game/DifficultySelector'
import type { GameMode } from '@/domains/games/types'
import type { WriterCoin } from '@/lib/writerCoins'

export type LoadingStep = 'validate' | 'extract' | 'generate' | 'save'
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'

export interface GeneratedGame {
  id: string
  slug: string
  title: string
  description: string
  imageUrl?: string
}

interface GameGeneratorState {
  selectedCoin: WriterCoin | null
  mode: GameMode
  url: string
  genre: GameGenre
  difficulty: GameDifficulty
  
  showCustomization: boolean
  showPayment: boolean
  paymentApproved: boolean
  showFidelityReview: boolean
  
  isGenerating: boolean
  loadingStep: LoadingStep | null
  stepStatuses: Record<LoadingStep, StepStatus>
  generatedGame: GeneratedGame | null
  error: string | null
  successData: { gameSlug: string; title: string; author?: string } | null
  
  setSelectedCoin: (coin: WriterCoin | null) => void
  setMode: (mode: GameMode) => void
  setUrl: (url: string) => void
  setGenre: (genre: GameGenre) => void
  setDifficulty: (difficulty: GameDifficulty) => void
  toggleCustomization: () => void
  setShowPayment: (show: boolean) => void
  setPaymentApproved: (approved: boolean) => void
  
  startGeneration: () => void
  setLoadingStep: (step: LoadingStep | null) => void
  setStepStatus: (step: LoadingStep, status: StepStatus) => void
  setGeneratedGame: (game: GeneratedGame | null) => void
  completeGeneration: (data: { gameSlug: string; title: string; author?: string }) => void
  setError: (error: string | null) => void
  reset: () => void
  resetForm: () => void
}

const initialStepStatuses: Record<LoadingStep, StepStatus> = {
  validate: 'pending',
  extract: 'pending',
  generate: 'pending',
  save: 'pending',
}

export const useGameGeneratorStore = create<GameGeneratorState>((set) => ({
  selectedCoin: null,
  mode: 'story',
  url: '',
  genre: 'horror' as GameGenre,
  difficulty: 'easy' as GameDifficulty,
  showCustomization: true,
  showPayment: false,
  paymentApproved: false,
  showFidelityReview: false,
  isGenerating: false,
  loadingStep: null,
  stepStatuses: { ...initialStepStatuses },
  generatedGame: null,
  error: null,
  successData: null,
  
  setSelectedCoin: (coin) => set({ selectedCoin: coin }),
  
  setMode: (mode) => set((state) => {
    if (mode === 'wordle') {
      return {
        mode,
        showCustomization: false,
        showPayment: false,
        paymentApproved: false,
      }
    }
    return { mode }
  }),
  
  setUrl: (url) => set({ url }),
  setGenre: (genre) => set({ genre }),
  setDifficulty: (difficulty) => set({ difficulty }),
   
  toggleCustomization: () => set((state) => ({ showCustomization: !state.showCustomization })),
  setShowPayment: (show) => set({ showPayment: show }),
  setPaymentApproved: (approved) => set({ paymentApproved: approved }),
  
  startGeneration: () => set({
    isGenerating: true,
    error: null,
    stepStatuses: { ...initialStepStatuses },
  }),
  
  setLoadingStep: (step) => set({ loadingStep: step }),
  
  setStepStatus: (step, status) => set((state) => ({
    stepStatuses: { ...state.stepStatuses, [step]: status },
  })),
  
  setGeneratedGame: (game) => set({ generatedGame: game, showFidelityReview: !!game }),
  
  completeGeneration: (data) => set({
    generatedGame: null,
    successData: data,
  }),
  
  setError: (error) => set({ error }),
  
  reset: () => set({
    isGenerating: false,
    loadingStep: null,
    stepStatuses: { ...initialStepStatuses },
    generatedGame: null,
    error: null,
    successData: null,
    showFidelityReview: false,
  }),
  
  resetForm: () => set({
    url: '',
    paymentApproved: false,
    showPayment: false,
  }),
}))