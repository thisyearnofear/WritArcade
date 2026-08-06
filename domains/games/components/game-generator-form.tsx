'use client'

import { GameGenerationOverlay } from '@/components/game/GameGenerationOverlay'
import { type WriterCoin } from '@/lib/writerCoins'
import {
  DesktopStepIndicator,
  MobileStepHeader,
  MobileStepNav,
} from '@/components/ui/step-indicator'
import { ArticleStep } from './steps/article-step'
import { CustomizeStep } from './steps/customize-step'
import { PaymentStep } from './steps/payment-step'
import { GenerateStep as GenerateStepButton } from './steps/generate-step'
import { useGameGenerator } from './use-game-generator'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: { id: string; title: string; slug: string; genre: string }) => void
  initialUrl?: string
  initialPaymentPath?: 'musd' | 'writercoin'
  initialMode?: 'story' | 'wordle'
  initialBasePaintDay?: number
  initialDailyChallenge?: boolean
}

export function GameGeneratorForm({
  onGameGenerated,
  initialUrl,
  initialPaymentPath,
  initialMode,
  initialBasePaintDay,
  initialDailyChallenge,
}: GameGeneratorFormProps) {
  const g = useGameGenerator({
    onGameGenerated,
    initialUrl,
    initialPaymentPath,
    initialMode,
    initialBasePaintDay,
    initialDailyChallenge,
  })

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step indicator — desktop phase bar, mobile header */}
      <DesktopStepIndicator currentStep={g.mobileStep} />
      <MobileStepHeader currentStep={g.mobileStep} />

      <form onSubmit={g.handleSubmit} className="space-y-6 pb-28 md:pb-0">
        <div className="space-y-4">

          {/* ── STEP 1: Article ── */}
          <div className={`${g.mobileStep === 'article' || g.isDesktop ? 'block' : 'hidden'}`}>
            <ArticleStep
              url={g.url}
              onUrlChange={g.handleUrlChange}
              isMusdPath={g.isMusdPath}
              detectedCoin={g.detectedCoin}
              isAutoDetected={g.isAutoDetected}
              onUseDetectedCoin={g.handleUseDetectedCoin}
              articlePreview={g.articlePreview}
              hasPreviewedCurrentUrl={g.hasPreviewedCurrentUrl}
              isPreviewingArticle={g.isPreviewingArticle}
              onPreview={g.previewArticle}
              initialMode={initialMode}
              mode={g.mode}
              onSelectStory={g.handleSelectStory}
              onSelectWordle={g.handleSelectWordle}
              dailyFlow={g.dailyFlow}
            />
          </div>

          {/* ── STEP 2: Customize ── */}
          <div className={`${g.mobileStep === 'customize' || g.isDesktop ? 'block' : 'hidden'}`}>
            <CustomizeStep
              isStoryMode={g.isStoryMode}
              hasPreviewedCurrentUrl={g.hasPreviewedCurrentUrl}
              showAdvancedPayment={g.showAdvancedPayment}
              onToggleAdvancedPayment={g.handleToggleAdvancedPayment}
              paymentPath={g.paymentPath}
              mode={g.mode}
              writerCoin={g.writerCoin}
              isMusdPath={g.isMusdPath}
              onSetMusdPath={g.handleSetMusdPath}
              onSetWriterCoinPath={g.handleSetWriterCoinPath}
              showWriterSelector={g.showWriterSelector}
              onToggleWriterSelector={g.handleToggleWriterSelector}
              onWriterCoinSelect={g.handleWriterCoinSelect}
              onSetModeWordle={g.handleSetModeWordle}
              showCustomization={g.showCustomization}
              onToggleCustomization={g.handleToggleCustomization}
              genre={g.genre}
              onGenreChange={g.setGenre}
              difficulty={g.difficulty}
              onDifficultyChange={g.setDifficulty}
              imageQuality={g.imageQuality}
              onImageQualityChange={g.setImageQuality}
              onResetDefaults={g.handleResetDefaults}
              isGenerating={g.isGenerating}
              articlePreview={g.articlePreview}
            />
          </div>

          {/* ── STEP 3: Payment ── */}
          {!g.isDailyFlow && (
          <div className={`${g.mobileStep === 'payment' || g.isDesktop ? 'block' : 'hidden'}`}>
            <PaymentStep
              error={g.error}
              onRetry={g.handleRetry}
              onDismiss={() => g.setError(null)}
              isStoryMode={g.isStoryMode}
              isMusdPath={g.isMusdPath}
              balance={g.balance}
              paymentApproved={g.paymentApproved}
              userBalance={g.userBalance}
              requiredAmount={g.requiredAmount}
              isLoadingBalance={g.isLoadingBalance}
              writerCoin={g.writerCoin}
              hasPreviewedCurrentUrl={g.hasPreviewedCurrentUrl}
              isGenerating={g.isGenerating}
              isPreviewingArticle={g.isPreviewingArticle}
              activePaymentTxHash={g.activePaymentTxHash}
              activePaymentExplorerUrl={g.activePaymentExplorerUrl}
              onContinueGeneration={() => g.generateGame(g.activePaymentTxHash)}
              paymentPath={g.paymentPath}
              onPaymentStart={g.handlePaymentStart}
              onPaymentSuccess={g.handlePaymentSuccess}
              onPaymentError={g.handlePaymentError}
              onPaymentPathChange={g.setPaymentPath}
              url={g.url}
            />
          </div>
          )}

          {/* ── STEP 4: Generate ── */}
          <div className={`${g.mobileStep === 'generate' || g.isDesktop ? 'block' : 'hidden'}`}>
            {(!g.isStoryMode || !g.hasPreviewedCurrentUrl || g.isDailyFlow) && (
              <GenerateStepButton
                isGenerating={g.isGenerating}
                hasPreviewedCurrentUrl={g.hasPreviewedCurrentUrl}
                isPreviewingArticle={g.isPreviewingArticle}
                isStoryMode={g.isStoryMode}
                paymentApproved={g.paymentApproved}
                genre={g.genre}
                url={g.url}
                isDailyFlow={g.isDailyFlow}
              />
            )}
          </div>

        </div>
      </form>

      <details className="mt-8 rounded-lg border border-border bg-card p-4 text-card-foreground">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Tips for better games</summary>
        <ul className="mt-3 list-disc pl-4 text-sm text-muted-foreground space-y-1.5">
          <li>{g.mode === 'wordle' ? 'Wordle works with public Paragraph.xyz articles and does not require payment.' : g.isMusdPath ? 'Paste any public Paragraph.xyz article to remix with MUSD.' : 'Paste URLs from Paragraph.xyz articles by the selected writer.'}</li>
          <li>Genre and difficulty shape how the AI interprets the article.</li>
          <li><a href="/workshop" className="text-primary hover:underline font-medium">Use the Workshop</a> for deeper personalization.</li>
        </ul>
      </details>

      <GameGenerationOverlay
        isOpen={g.isGenerating}
        currentStep={g.loadingStep}
        stepStatuses={g.stepStatuses}
        genre={g.genre}
        difficulty={g.difficulty}
      />

      {/* Mobile bottom nav — back button + step dots */}
      {!g.isGenerating && (
        <MobileStepNav
          currentStep={g.mobileStep}
          canGoBack={g.canGoBack}
          onBack={g.handleStepBack}
        />
      )}
    </div>
  )
}
