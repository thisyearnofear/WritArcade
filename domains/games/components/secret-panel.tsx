'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, Eye, Loader2 } from 'lucide-react'

interface SecretPanelProps {
  gameId: string
  gameSlug: string
  primaryColor: string
  // Pre-decrypted data (when NFT holder has already unlocked)
  decryptedNarrative?: string | null
  decryptedImageUrl?: string | null
  // Encrypted metadata (for showing locked state)
  isEncrypted: boolean
  nftTokenId?: string | null
  // User's wallet state
  isConnected: boolean
  walletAddress?: string
}

export function SecretPanel({
  gameId,
  gameSlug,
  primaryColor,
  decryptedNarrative,
  decryptedImageUrl,
  isEncrypted,
  nftTokenId,
  isConnected,
  walletAddress,
}: SecretPanelProps) {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(!!decryptedNarrative)
  const [narrative, setNarrative] = useState<string | null>(decryptedNarrative || null)
  const [imageUrl, setImageUrl] = useState<string | null>(decryptedImageUrl || null)
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setError('Connect your wallet to unlock this panel')
      return
    }

    setIsUnlocking(true)
    setError(null)

    try {
      const response = await fetch(`/api/games/${gameSlug}/secret-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, gameId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock secret panel')
      }

      if (data.narrative) {
        setNarrative(data.narrative)
        setImageUrl(data.imageUrl || null)
        setUnlocked(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
    } finally {
      setIsUnlocking(false)
    }
  }, [isConnected, walletAddress, gameSlug, gameId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Panel label */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{
            backgroundColor: `${primaryColor}20`,
            color: primaryColor,
          }}
        >
          SECRET PANEL
        </span>
        {unlocked ? (
          <Eye className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        ) : (
          <Lock className="w-3.5 h-3.5 text-gray-500" />
        )}
      </div>

      {/* Panel container */}
      <div
        className="relative overflow-hidden rounded-lg border-2"
        style={{
          borderColor: unlocked ? primaryColor : '#374151',
          backgroundColor: unlocked ? '#111827' : '#0a0a0a',
        }}
      >
        <AnimatePresence mode="wait">
          {unlocked && narrative ? (
            /* UNLOCKED STATE */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {/* Image */}
              {imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Secret panel illustration"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent" />
                </div>
              )}

              {/* Narrative */}
              <div className="p-5">
                <p className="text-gray-100 text-base leading-relaxed font-medium italic">
                  &ldquo;{narrative}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <Unlock className="w-3 h-3" />
                  <span>Unlocked by NFT ownership</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* LOCKED STATE */
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="p-8 text-center"
            >
              {/* Blurred preview hint */}
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 2 }}
                >
                  <div className="bg-gray-900/80 backdrop-blur-sm rounded-full p-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <div className="h-24 opacity-10 blur-xl bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
              </div>

              <h3 className="text-lg font-bold text-gray-200 mb-2">
                A Secret Awaits
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                This game holds a hidden epilogue — an alternate ending only
                revealed to those who truly own the experience.
              </p>

              {/* Unlock action */}
              {isEncrypted && nftTokenId ? (
                <div>
                  {isConnected ? (
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
                      style={{
                        backgroundColor: primaryColor,
                        color: '#000',
                        opacity: isUnlocking ? 0.7 : 1,
                      }}
                    >
                      {isUnlocking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying ownership...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Unlock with NFT
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-xs text-gray-600">
                      Connect your wallet to check NFT ownership
                    </p>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-xs text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  This panel will be available after minting
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
