/**
 * Comprehensive error handling and user-friendly error messages
 */

export type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PAYMENT_ERROR'
  | 'WALLET_ERROR'
  | 'GENERATION_ERROR'
  | 'URL_INVALID'
  | 'URL_UNREACHABLE'
  | 'CONTENT_EXTRACTION_FAILED'
  | 'MINTING_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorInfo {
  type: ErrorType
  message: string
  userMessage: string
  details?: string
  retryable: boolean
}

/**
 * Categorize and format errors for user display
 */
export function formatError(error: unknown, context?: string): ErrorInfo {
  // Handle Error objects
  if (error instanceof Error) {
    return categorizeError(error.message, context)
  }

  // Handle string errors
  if (typeof error === 'string') {
    return categorizeError(error, context)
  }

  // Handle objects with error property
  if (error && typeof error === 'object' && 'error' in error) {
    return categorizeError(String(error.error), context)
  }

  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again later.',
    retryable: true,
  }
}

/**
 * Categorize error message and provide user-friendly message
 */
function categorizeError(message: string, context?: string): ErrorInfo {
  const lowerMessage = message.toLowerCase()

  // Validation errors
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('validation') ||
    lowerMessage.includes('must be')
  ) {
    return {
      type: 'VALIDATION_ERROR',
      message,
      userMessage: 'Please check your input and try again.',
      retryable: true,
    }
  }

  // URL errors
  if (
    lowerMessage.includes('url') ||
    lowerMessage.includes('invalid url') ||
    lowerMessage.includes('url does not match')
  ) {
    return {
      type: 'URL_INVALID',
      message,
      userMessage:
        'Please enter a valid Paragraph.xyz article URL. ' +
        'Make sure it starts with "http://" or "https://".',
      retryable: true,
    }
  }

  // URL unreachable
  if (
    lowerMessage.includes('404') ||
    lowerMessage.includes('unreachable') ||
    lowerMessage.includes('fetch')
  ) {
    return {
      type: 'URL_UNREACHABLE',
      message,
      userMessage:
        'Could not access that URL. Please check that the link is valid and publicly accessible.',
      retryable: true,
    }
  }

  // Content extraction failed
  if (lowerMessage.includes('content') || lowerMessage.includes('extract')) {
    return {
      type: 'CONTENT_EXTRACTION_FAILED',
      message,
      userMessage:
        'Could not extract content from that page. Try pasting the article text directly instead.',
      retryable: true,
    }
  }

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('econnrefused')
  ) {
    return {
      type: 'NETWORK_ERROR',
      message,
      userMessage: 'Network connection failed. Please check your internet and try again.',
      retryable: true,
    }
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('took too long')) {
    return {
      type: 'TIMEOUT_ERROR',
      message,
      userMessage:
        'The request took too long. This might be a temporary issue. Please try again.',
      retryable: true,
    }
  }

  // Payment/wallet errors
  if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
    return {
      type: 'WALLET_ERROR',
      message,
      userMessage:
        'Wallet connection failed. Make sure your wallet is installed, unlocked, and connected.',
      retryable: true,
    }
  }

  if (
    lowerMessage.includes('payment') ||
    lowerMessage.includes('insufficient') ||
    lowerMessage.includes('balance')
  ) {
    return {
      type: 'PAYMENT_ERROR',
      message,
      userMessage:
        'Payment failed. Check that you have sufficient balance and approve the transaction.',
      retryable: true,
    }
  }

  // Minting errors
  if (lowerMessage.includes('mint')) {
    return {
      type: 'MINTING_ERROR',
      message,
      userMessage: 'Failed to mint NFT. Please try again or contact support.',
      retryable: true,
    }
  }

  // User rejected / cancelled the transaction
  if (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('user cancelled') ||
    lowerMessage.includes('action_rejected') ||
    lowerMessage.includes('rejected by user') ||
    lowerMessage.includes('user closed')
  ) {
    return {
      type: 'WALLET_ERROR',
      message,
      userMessage: 'You cancelled the transaction. Nothing was charged — try again when you\'re ready.',
      retryable: true,
    }
  }

  // Wallet mismatch / not the game owner
  if (
    lowerMessage.includes('do not own this game') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('not the owner')
  ) {
    return {
      type: 'WALLET_ERROR',
      message,
      userMessage:
        'The connected wallet doesn\'t match the wallet that generated this game. Switch to the original wallet in your wallet app and try again.',
      retryable: true,
    }
  }

  // Insufficient gas / funds for transaction
  if (
    lowerMessage.includes('insufficient funds for gas') ||
    lowerMessage.includes('insufficient fee') ||
    lowerMessage.includes('out of gas')
  ) {
    return {
      type: 'WALLET_ERROR',
      message,
      userMessage:
        'Your wallet doesn\'t have enough ETH on this network to pay for the transaction fee. Top up and retry.',
      retryable: true,
    }
  }

  // Wrong network / chain
  if (
    lowerMessage.includes('chain mismatch') ||
    lowerMessage.includes('wrong chain') ||
    lowerMessage.includes('unsupported chain') ||
    lowerMessage.includes('chainid')
  ) {
    return {
      type: 'WALLET_ERROR',
      message,
      userMessage: 'Your wallet is on the wrong network. Use the Switch Network button above to continue.',
      retryable: true,
    }
  }

  // Contract revert with known reasons
  if (lowerMessage.includes('minter_role') || lowerMessage.includes('minterrole')) {
    return {
      type: 'MINTING_ERROR',
      message,
      userMessage:
        'The mint contract is not authorized. This is a platform-side issue — please try again in a moment.',
      retryable: true,
    }
  }

  if (lowerMessage.includes('execution reverted') || lowerMessage.includes('revert')) {
    return {
      type: 'UNKNOWN_ERROR',
      message,
      userMessage:
        'The transaction couldn\'t be completed. If you\'re switching between Writer Coin and MUSD, make sure you have the right balance on the right chain.',
      retryable: true,
    }
  }

  // Generation errors
  if (
    lowerMessage.includes('generation') ||
    lowerMessage.includes('generate') ||
    lowerMessage.includes('ai')
  ) {
    return {
      type: 'GENERATION_ERROR',
      message,
      userMessage: 'Game generation failed. Please check your input and try again.',
      retryable: true,
    }
  }

  // Default unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message,
    userMessage: 'Something went wrong. Please try again later.',
    details: context ? `Context: ${context}` : undefined,
    retryable: true,
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorInfo = formatError(error)
  return errorInfo.retryable
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  const errorInfo = formatError(error)
  return errorInfo.userMessage
}

/**
 * Exponential backoff retry with jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error
      }

      onRetry?.(attempt + 1, lastError)

      // Exponential backoff with jitter: delay * 2^attempt + random jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Retry failed')
}
