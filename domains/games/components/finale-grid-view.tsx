'use client'

import type { useVideoMotion } from './finale-video-motion'
import type { ComicBookFinalePanelData } from './comic-book-finale'

interface GridViewProps {
  panels: ComicBookFinalePanelData[]
  currentPanelIndex: number
  setCurrentPanelIndex: (index: number) => void
  primaryColor: string
  epilogueReflection?: string
  articleTitle?: string
  articleUrl: string
  authorParagraphUsername: string
  getPanelVideo: ReturnType<typeof useVideoMotion>['getPanelVideo']
}

/**
 * Grid view — shows all panels in a responsive grid with a reflection card.
 * Extracted from ComicBookFinale to reduce its size.
 */
export function GridView({
  panels,
  currentPanelIndex,
  setCurrentPanelIndex,
  primaryColor,
  epilogueReflection,
  articleTitle,
  articleUrl,
  authorParagraphUsername,
  getPanelVideo,
}: GridViewProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {panels.map((panel, idx) => (
          <div
            key={panel.id}
            className="rounded-lg overflow-hidden border-2 shadow-lg cursor-pointer transition-transform hover:scale-105"
            style={{
              borderColor: idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            onClick={() => setCurrentPanelIndex(idx)}
          >
            <div className="aspect-square overflow-hidden bg-black">
              {getPanelVideo(panel.id)?.videoUrl ? (
                <video
                  src={getPanelVideo(panel.id)?.videoUrl ?? undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : panel.imageUrl ? (
                <img
                  src={panel.imageUrl}
                  alt={`Panel ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-card">
                  <p className="text-muted-foreground text-sm">No image</p>
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: primaryColor }}>
                  {panel.id.startsWith('epilogue-') ? 'Epilogue' : `Panel ${idx + 1}`}
                </span>
                <span className="text-xs text-muted-foreground">{panel.imageModel}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {panel.narrativeText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reflection Card */}
      {epilogueReflection && (
        <div
          className="mt-8 p-6 rounded-xl border-l-4"
          style={{
            borderLeftColor: primaryColor,
            backgroundColor: `${primaryColor}08`,
          }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Back to the Source
              </h3>
              <h4 className="text-lg font-bold mb-1">
                {articleTitle || 'Original Article'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                by {authorParagraphUsername}
              </p>
              <p className="text-base leading-relaxed">
                {epilogueReflection}
              </p>
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm underline opacity-60 hover:opacity-100 transition-opacity"
              >
                Read original article →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
