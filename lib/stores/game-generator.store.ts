import { create } from 'zustand'
import { type GameGenre } from '@/components/game/GenreSelector'
import { type GameDifficulty } from '@/components/game/DifficultySelector'
import type { GameMode } from '@/domains/games/types'
import type { WriterCoin } from '@/lib/writerCoins'
import type { PaymentPath, ImageQuality, GenerateErrorState, ArticlePreview } from '@/domains/games/components/game-generator-helpers'
import type { GenerateStep } from '@/components/ui/step-indicator'

export type LoadingStep = 'payment' | 'validate' | 'extract' | 'generate' | 'save'
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error'

export interface GeneratedGame {
  id: string
  slug: string
  title: string
  description: string
  imageUrl?: string
}

export interface DailyGenerateFlow {
  day: number
  theme: string
  promptText: string
  canvasUrl?: string
  palette?: string[]
  sourceType?: 'basepaint' | 'dual'
  articleUrl?: string
  articleTitle?: string
  articleAuthor?: string
  canvasTheme?: string
}

/** Create-flow preview of today's BasePaint world (optional staging). */
export interface BasePaintStagePreview {
  day: number
  theme: string
  canvasUrl?: string
  palette?: string[]
}

const initialStepStatuses: Record<LoadingStep, StepStatus> = {
  payment: 'pending',
  validate: 'pending',
  extract: 'pending',
  generate: 'pending',
  save: 'pending',
}

interface GameGeneratorState {
  // ── Core form state ──────────────────────────────────────────────────
  url: string
  mode: GameMode
  genre: GameGenre
  difficulty: GameDifficulty
  imageQuality: ImageQuality
  paymentPath: PaymentPath
  selectedCoin: WriterCoin | null

  // ── Article preview ──────────────────────────────────────────────────
  articlePreview: ArticlePreview | null
  previewedUrl: string
  isPreviewingArticle: boolean

  // ── UI toggles ───────────────────────────────────────────────────────
  showCustomization: boolean
  showAdvancedPayment: boolean
  showWriterSelector: boolean
  mobileStep: GenerateStep

  // ── Payment ─────────────────────────────────────────────────────────
  paymentApproved: boolean

  // ── Generation ───────────────────────────────────────────────────────
  isGenerating: boolean
  loadingStep: LoadingStep | null
  stepStatuses: Record<LoadingStep, StepStatus>
  error: GenerateErrorState | null

  dailyFlow: DailyGenerateFlow | null

  /** Create: stage the writer's article inside today's BasePaint canvas. */
  stageWithBasePaint: boolean
  basePaintStage: BasePaintStagePreview | null
  isLoadingBasePaintStage: boolean

  // ── Actions ─────────────────────────────────────────────────────────
  setUrl: (url: string) => void
  setMode: (mode: GameMode) => void
  setGenre: (genre: GameGenre) => void
  setDifficulty: (difficulty: GameDifficulty) => void
  setImageQuality: (quality: ImageQuality) => void
  setPaymentPath: (path: PaymentPath) => void
  setSelectedCoin: (coin: WriterCoin | null) => void

  setArticlePreview: (preview: ArticlePreview | null) => void
  setPreviewedUrl: (url: string) => void
  setIsPreviewingArticle: (previewing: boolean) => void

  toggleCustomization: () => void
  toggleAdvancedPayment: () => void
  toggleWriterSelector: () => void
  setMobileStep: (step: GenerateStep) => void

  setPaymentApproved: (approved: boolean) => void
  resetPaymentProgress: () => void

  startGeneration: () => void
  setIsGenerating: (isGenerating: boolean) => void
  setLoadingStep: (step: LoadingStep | null) => void
  setStepStatus: (step: LoadingStep, status: StepStatus) => void
  setStepStatuses: (statuses: Record<LoadingStep, StepStatus>) => void
  setError: (error: GenerateErrorState | null) => void
  setDailyFlow: (flow: DailyGenerateFlow | null) => void
  setStageWithBasePaint: (enabled: boolean) => void
  setBasePaintStage: (stage: BasePaintStagePreview | null) => void
  setIsLoadingBasePaintStage: (loading: boolean) => void

  reset: () => void
  resetForm: () => void
}

export const useGameGeneratorStore = create<GameGeneratorState>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────
  url: '',
  mode: 'story',
  genre: 'horror' as GameGenre,
  difficulty: 'easy' as GameDifficulty,
  imageQuality: 'fast' as ImageQuality,
  paymentPath: 'musd' as PaymentPath,
  selectedCoin: null,

  articlePreview: null,
  previewedUrl: '',
  isPreviewingArticle: false,

  showCustomization: false,
  showAdvancedPayment: false,
  showWriterSelector: false,
  mobileStep: 'article',

  paymentApproved: false,

  isGenerating: false,
  loadingStep: null,
  stepStatuses: { ...initialStepStatuses },
  error: null,
  dailyFlow: null,
  stageWithBasePaint: false,
  basePaintStage: null,
  isLoadingBasePaintStage: false,

  // ── Actions ─────────────────────────────────────────────────────────
  setUrl: (url) => set({ url }),
  setMode: (mode) => set({ mode }),
  setGenre: (genre) => set({ genre }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setImageQuality: (imageQuality) => set({ imageQuality }),
  setPaymentPath: (paymentPath) => set({ paymentPath }),
  setSelectedCoin: (selectedCoin) => set({ selectedCoin }),

  setArticlePreview: (articlePreview) => set({ articlePreview }),
  setPreviewedUrl: (previewedUrl) => set({ previewedUrl }),
  setIsPreviewingArticle: (isPreviewingArticle) => set({ isPreviewingArticle }),

  toggleCustomization: () => set((s) => ({ showCustomization: !s.showCustomization })),
  toggleAdvancedPayment: () => set((s) => ({ showAdvancedPayment: !s.showAdvancedPayment })),
  toggleWriterSelector: () => set((s) => ({ showWriterSelector: !s.showWriterSelector })),
  setMobileStep: (mobileStep) => set({ mobileStep }),

  setPaymentApproved: (paymentApproved) => set({ paymentApproved }),
  resetPaymentProgress: () => set({ paymentApproved: false }),

  startGeneration: () => set({
    isGenerating: true,
    error: null,
    stepStatuses: { ...initialStepStatuses },
  }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setLoadingStep: (loadingStep) => set({ loadingStep }),
  setStepStatus: (step, status) => set((s) => ({
    stepStatuses: { ...s.stepStatuses, [step]: status },
  })),
  setStepStatuses: (stepStatuses) => set({ stepStatuses }),
  setError: (error) => set({ error }),
  setDailyFlow: (dailyFlow) => set({ dailyFlow }),
  setStageWithBasePaint: (stageWithBasePaint) => set({ stageWithBasePaint }),
  setBasePaintStage: (basePaintStage) => set({ basePaintStage }),
  setIsLoadingBasePaintStage: (isLoadingBasePaintStage) => set({ isLoadingBasePaintStage }),

  reset: () => set({
    isGenerating: false,
    loadingStep: null,
    stepStatuses: { ...initialStepStatuses },
    error: null,
  }),

  resetForm: () => set({
    url: '',
    paymentApproved: false,
    articlePreview: null,
    previewedUrl: '',
    error: null,
    dailyFlow: null,
    stageWithBasePaint: false,
    basePaintStage: null,
    isLoadingBasePaintStage: false,
  }),
}))
