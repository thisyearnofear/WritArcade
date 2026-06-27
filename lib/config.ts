/**
 * writersarcade Configuration & Feature Flags
 * Centralized environment and feature management
 */

/**
 * Environment Detection
 */
export const config = {
  // Environment info
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
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
    // Aeneid Testnet: 1514 (deprecated) → 1315 (current)
    // Using SDK's chain ID (1315) for consistency
    chainId: process.env.STORY_CHAIN_ID ? parseInt(process.env.STORY_CHAIN_ID) : 1315,
  },

  /**
   * Payment Verification
   * Async verification with polling (not immediate)
   */
  payments: {
    pollIntervalMs: 3000, // Check blockchain every 3 seconds
    maxRetries: 20, // Max 60 seconds total
  },

  /**
   * Database Configuration
   */
  database: {
    url: process.env.DATABASE_URL,
  },

  /**
   * Lit Protocol Configuration
   * NFT-gated encryption for secret game panels
   */
  litProtocol: {
    // Deprecated: CDR vaults supersede Lit for all new secret panel encryption.
    // Defaults to disabled; set LIT_PROTOCOL_ENABLED=true to re-enable
    // for legacy game decryption support.
    enabled: process.env.LIT_PROTOCOL_ENABLED === 'true',
    rpcUrl: process.env.LIT_RPC_URL || 'https://lit-protocol-datil-dev.rpc.litgateway.com',
    network: process.env.LIT_NETWORK || 'datil-dev',
  },

  /**
   * Hypercerts Configuration (AT Protocol)
   * Impact certificates for creative contributions
   */
  hypercerts: {
    enabled: process.env.HYPERCERTS_ENABLED !== 'false',
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
