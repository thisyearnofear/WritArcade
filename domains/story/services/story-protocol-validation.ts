/**
 * Story Protocol Environment Validation
 * Validates required environment variables and configuration
 */

export interface StoryProtocolConfig {
  rpcUrl: string;
  chainId: number;
  ipfs: {
    gatewayUrl: string;
    uploadEndpoint: string;
  };
  pilFlavor: 'non-commercial' | 'commercial' | 'commercial-remix';
  spgContract: string;
  licenseRegistry: string;
  pilot: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Story Protocol environment configuration
 */
export function validateStoryProtocolConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  const required = [
    'NEXT_PUBLIC_STORY_RPC_URL',
    'NEXT_PUBLIC_STORY_CHAIN_ID',
    'NEXT_PUBLIC_STORY_SPG_CONTRACT',
    'NEXT_PUBLIC_STORY_IPFS_GATEWAY',
    'NEXT_PUBLIC_STORY_LICENSE_REGISTRY',
  ];

  for (const env of required) {
    if (!process.env[env]) {
      errors.push(`Missing required environment variable: ${env}`);
    }
  }

  // Validate chain ID
  const chainId = process.env.NEXT_PUBLIC_STORY_CHAIN_ID;
  if (chainId) {
    const validChains = ['1514', '1516', '1315'];
    if (!validChains.includes(chainId)) {
      warnings.push(`Unusual chain ID: ${chainId}. Expected one of: ${validChains.join(', ')}`);
    }
  }

  // Validate RPC URL is not localhost in production
  const rpcUrl = process.env.NEXT_PUBLIC_STORY_RPC_URL;
  if (rpcUrl && rpcUrl.includes('localhost')) {
    warnings.push('RPC URL points to localhost - not suitable for production');
  }

  // Check for WALLET_PRIVATE_KEY (server-side only)
  if (typeof window === 'undefined' && !process.env.WALLET_PRIVATE_KEY) {
    warnings.push('WALLET_PRIVATE_KEY not set - server-side IP registration may fail');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results to console
 */
export function logStoryProtocolValidation(): void {
  const result = validateStoryProtocolConfig();
  
  console.log('🔍 Story Protocol Configuration Validation:');
  
  if (result.isValid) {
    console.log('   ✅ Configuration valid');
  } else {
    console.log('   ❌ Configuration errors:');
    result.errors.forEach(e => console.log(`      - ${e}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('   ⚠️ Warnings:');
    result.warnings.forEach(w => console.log(`      - ${w}`));
  }
}

/**
 * Get Story Protocol configuration from environment
 */
export function getStoryProtocolConfig(): StoryProtocolConfig {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_STORY_RPC_URL || '',
    chainId: parseInt(process.env.NEXT_PUBLIC_STORY_CHAIN_ID || '1315', 10),
    ipfs: {
      gatewayUrl: process.env.NEXT_PUBLIC_STORY_IPFS_GATEWAY || '',
      uploadEndpoint: process.env.NEXT_PUBLIC_STORY_IPFS_UPLOAD_ENDPOINT || '',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pilFlavor: (process.env.NEXT_PUBLIC_STORY_PIL_FLAVOR as any) || 'commercial-remix',
    spgContract: process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT || '',
    licenseRegistry: process.env.NEXT_PUBLIC_STORY_LICENSE_REGISTRY || '',
    pilot: process.env.NEXT_PUBLIC_STORY_PILOT === 'true',
  };
}