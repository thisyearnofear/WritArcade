/**
 * IPFS Utilities for Story Protocol
 * Handles metadata uploads to IPFS for IP asset registration
 */

import { createHash } from "crypto"
import { logger, config } from "@/lib/config"

type GroveUploadResponse = {
  storage_key?: string
  gateway_url?: string
  uri?: string
  status_url?: string
}

/**
 * Upload metadata to IPFS
 * Requires PINATA_JWT or similar IPFS provider credentials
 */
export async function uploadToIPFS(metadata: object): Promise<string> {
  if (typeof window !== 'undefined') {
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata }),
    })

    const result = await response
      .json()
      .catch(() => ({} as { uri?: string; error?: string }))

    if (!response.ok || !result.uri) {
      throw new Error(result.error || `IPFS upload failed (${response.status})`)
    }

    return result.uri
  }

  const pinataBearerToken = config.ipfs.pinataJwt;

  if (!pinataBearerToken) {
    if (!config.isProduction) {
      logger.warn("IPFS: Using mock hash for development", { context: 'ipfs-upload' });
      return generateMockIPFSHash(JSON.stringify(metadata));
    }

    logger.warn('PINATA_JWT missing in production; trying Grove fallback', { context: 'ipfs-upload' });
    return uploadToGrove(metadata);
  }

  try {
    // Upload to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataBearerToken}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `writersarcade Asset ${Date.now()}`,
          keyvalues: {
            type: "asset-metadata",
            timestamp: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { IpfsHash: string };
    const ipfsHash = data.IpfsHash;

    logger.ipfs('Uploaded to IPFS', { hash: ipfsHash });
    return `ipfs://${ipfsHash}`;
  } catch (error) {
    logger.error("IPFS upload failed", error, { context: 'ipfs-upload' });

    if (config.isProduction) {
      logger.warn("Trying Grove fallback after Pinata upload failure", { context: 'ipfs-upload' });
      return uploadToGrove(metadata);
    }

    // Fall back to mock for development only
    logger.warn("Falling back to mock IPFS hash for development", { context: 'ipfs-upload' });
    return generateMockIPFSHash(JSON.stringify(metadata));
  }
}

async function uploadToGrove(metadata: object): Promise<string> {
  const chainId = Number.isFinite(config.ipfs.groveChainId)
    ? config.ipfs.groveChainId
    : 8453

  const response = await fetch(`https://api.grove.storage/?chain_id=${chainId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Grove upload failed: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ''}`)
  }

  const parsed = (await response.json()) as GroveUploadResponse | GroveUploadResponse[]
  const result = Array.isArray(parsed) ? parsed[0] : parsed
  const uri = result.gateway_url || result.uri

  if (!uri) {
    throw new Error('Grove upload failed: response did not include gateway_url or uri')
  }

  logger.ipfs('Uploaded to Grove', {
    storageKey: result.storage_key,
    uri: result.uri,
  })

  return uri
}

/**
 * Generate a consistent mock IPFS hash for development
 */
function generateMockIPFSHash(data: string): string {
  // Simulate a real IPFS hash format
  const hash = createHash("sha256").update(data).digest("hex");
  return `ipfs://QmMock${hash.slice(0, 50)}`;
}

/**
 * Compute metadata hash for Story Protocol registration
 * Story requires a hash of metadata for integrity verification
 */
export function computeMetadataHash(metadata: object): string {
  const jsonString = JSON.stringify(metadata);
  const hash = createHash("sha256").update(jsonString).digest("hex");
  return `0x${hash}`;
}

/**
 * Format metadata for Story Protocol registration
 */
export interface IPAssetMetadata {
  title: string;
  description: string;
  creators?: Array<{
    name: string;
    address: string;
    contributionPercent: number;
  }>;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  mediaUrl?: string;
  ipfsUrl?: string;
  timestamp: string;
}

/**
 * Build asset metadata for IP registration
 */
export function buildAssetMetadata(params: {
  title: string;
  description: string;
  creatorAddress: string;
  creatorName?: string;
  genre: string;
  tags?: string[];
  articleUrl?: string;
  imageUrl?: string;
}): IPAssetMetadata {
  return {
    title: params.title,
    description: params.description,
    creators: [
      {
        name: params.creatorName || "Unknown Creator",
        address: params.creatorAddress,
        contributionPercent: 100,
      },
    ],
    attributes: [
      { key: "genre", value: params.genre },
      ...(params.tags
        ? params.tags.map((tag, i) => ({ key: `tag_${i}`, value: tag }))
        : []),
      ...(params.articleUrl
        ? [{ key: "articleUrl", value: params.articleUrl }]
        : []),
    ],
    ...(params.imageUrl ? { mediaUrl: params.imageUrl } : {}),
    timestamp: new Date().toISOString(),
  };
}
