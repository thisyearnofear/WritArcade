/**
 * writersarcade Configuration & Feature Flags
 * Centralized environment and feature management
 */

/**
 * Environment Detection
 */
/**
 * writersarcade Feature Flags
 * Centralized toggle for non-core features.
 * Default everything OFF except the core Quick Games + IP Registration + CDR flow.
 */
export const features = {
  /** Asset Marketplace — compose games from marketplace assets */
  assetMarketplace: process.env.FEATURE_ASSET_MARKETPLACE === 'true',
  /** Hypercerts / AT Protocol impact certificates */
  hypercerts: process.env.FEATURE_HYPERCERTS === 'true',
  /** Lit Protocol — legacy secret panel encryption (superseded by CDR) */
  litProtocol: process.env.FEATURE_LIT_PROTOCOL === 'true',
  /** SuperRare NFT minting bridge */
  superrare: process.env.FEATURE_SUPERRARE === 'true',
  /** Etherfuse fiat on-ramp */
  etherfuse: process.env.FEATURE_ETHERFUSE === 'true',
  /** Farcaster mini-app */
  farcasterMiniApp: process.env.FEATURE_FARCASTER_MINI_APP === 'true',
  /** Video pipeline (future) */
  videoPipeline: process.env.FEATURE_VIDEO_PIPELINE === 'true',
} as const

/** Shorthand: is a given feature enabled? */
export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature]
}

export const config = {
  // Environment info
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  /**
   * Feature flags
   */
  features,
  isFeatureEnabled,

  /**
   * IPFS Configuration
   * - Production: REQUIRES PINATA_JWT, throws error if missing
   * - Development: Uses mock IPFS for faster iteration
   */
  ipfs: {
    enableMock: process.env.NODE_ENV === 'development',
    pinataJwt: process.env.PINATA_JWT,
    groveChainId: Number.parseInt(process.env.GROVE_CHAIN_ID || '8453', 10),
  },

  /**
   * Story Protocol Configuration
   * Enables/disables Story Protocol integration for IP registration
   */
  storyProtocol: {
    enabled: process.env.STORY_PROTOCOL_ENABLED !== 'false',
    rpcUrl: process.env.STORY_RPC_URL || 'https://aeneid.storyrpc.io',
    chainId: process.env.STORY_CHAIN_ID ? parseInt(process.env.STORY_CHAIN_ID) : 1315,
  },

  /**
   * Payment Verification
   * Async verification with polling (not immediate)
   */
  payments: {
    pollIntervalMs: 3000,
    maxRetries: 20,
  },

  /**
   * Database Configuration
   */
  database: {
    url: process.env.DATABASE_URL,
  },

  /**
   * Lit Protocol — now managed via features flag
   */
  litProtocol: {
    enabled: features.litProtocol,
    rpcUrl: process.env.LIT_RPC_URL || 'https://lit-protocol-datil-dev.rpc.litgateway.com',
    network: process.env.LIT_NETWORK || 'datil-dev',
  },

  /**
   * Hypercerts — now managed via features flag
   */
  hypercerts: {
    enabled: features.hypercerts,
    pdsUrl: process.env.HYPERCERTS_PDS_URL || 'https://certified.app',
  },

  /**
   * API Rate Limiting & Security
   */
  api: {
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    maxRequestsPerMinute: parseInt(process.env.API_RATE_LIMIT || '60'),
  },
} as const

/**
 * Validate critical configuration at startup
 */
export function validateConfig(): void {
  const errors: string[] = []

  if (config.isProduction) {
    // IPFS uploads can use Pinata or Grove fallback. Keep validation here
    // non-fatal for PINATA_JWT so the runtime fallback can handle provider
    // choice per upload.

    // Production requires database
    if (!config.database.url) {
      errors.push('DATABASE_URL environment variable is required in production')
    }

    // Production requires a session signing secret (unsigned cookies are forgeable)
    const sessionSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if (!sessionSecret || sessionSecret.length < 16) {
      errors.push('AUTH_SECRET environment variable (>= 16 chars) is required in production for session signing')
    }

    // Production requires Story Protocol SPG contract
    const spgContract = process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT
    if (!spgContract) {
      errors.push('NEXT_PUBLIC_STORY_SPG_CONTRACT environment variable is required in production for IP registration')
    }
  }

  // Fail fast if any critical config is missing
  if (errors.length > 0) {
    throw new Error(`[Config] Configuration validation failed:\n${errors.join('\n')}`)
  }

  console.log('[Config] Environment:', {
    environment: process.env.NODE_ENV,
    ipfsEnabled: !config.ipfs.enableMock,
    storyProtocolEnabled: config.storyProtocol.enabled,
  })
}

/**
 * Logging Service
 * Centralized logging with context
 */
export interface LogContext {
  userId?: string
  requestId?: string
  endpoint?: string
  [key: string]: unknown
}

export const logger = {
  /**
   * Info: General informational messages
   */
  info: (message: string, context?: LogContext) => {
    if (config.isProduction) {
      console.log(`[INFO] ${message}`, context)
    } else {
      console.log(`ℹ️  ${message}`, context)
    }
  },

  /**
   * Warn: Warning messages (non-blocking issues)
   */
  warn: (message: string, context?: LogContext) => {
    if (config.isProduction) {
      console.warn(`[WARN] ${message}`, context)
    } else {
      console.warn(`⚠️  ${message}`, context)
    }
  },

  /**
   * Error: Error messages (blocking issues)
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    if (config.isProduction) {
      console.error(`[ERROR] ${message}`, error, context)
    } else {
      console.error(`❌ ${message}`, error, context)
    }
  },

  /**
   * Debug: Development-only debugging
   */
  debug: (message: string, data?: unknown) => {
    if (!config.isProduction) {
      console.log(`🔍 ${message}`, data)
    }
  },

  /**
   * Payment-specific logging
   */
  payment: (action: string, context: LogContext) => {
    logger.info(`[Payment] ${action}`, context)
  },

  /**
   * Story Protocol-specific logging
   */
  storyProtocol: (action: string, context: LogContext) => {
    if (config.storyProtocol.enabled) {
      logger.info(`[Story Protocol] ${action}`, context)
    }
  },

  /**
   * IPFS-specific logging
   */
  ipfs: (action: string, context: LogContext) => {
    logger.info(`[IPFS] ${action}`, context)
  },

  /**
   * Lit Protocol-specific logging
   */
  litProtocol: (action: string, context: LogContext) => {
    if (config.litProtocol.enabled) {
      logger.info(`[Lit Protocol] ${action}`, context)
    }
  },

  /**
   * Hypercerts-specific logging
   */
  hypercerts: (action: string, context: LogContext) => {
    if (config.hypercerts.enabled) {
      logger.info(`[Hypercerts] ${action}`, context)
    }
  },
}
