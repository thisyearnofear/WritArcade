/**
 * IPFS Utilities for Story Protocol
 * Handles metadata uploads to IPFS for IP asset registration
 */

import { createHash } from "crypto"
import { logger, config } from "@/lib/config"

/**
 * Upload metadata to IPFS
 * Requires PINATA_JWT or similar IPFS provider credentials
 */
export async function uploadToIPFS(metadata: object): Promise<string> {
  const pinataBearerToken = config.ipfs.pinataJwt;

  if (!pinataBearerToken) {
    if (config.isProduction) {
      logger.error('PINATA_JWT missing in production', undefined, { context: 'ipfs-upload' });
      throw new Error(
        'PINATA_JWT environment variable is required in production for IPFS uploads.'
      );
    }
    logger.warn("IPFS: Using mock hash for development", { context: 'ipfs-upload' });
    return generateMockIPFSHash(JSON.stringify(metadata));
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
      throw error;
    }

    // Fall back to mock for development only
    logger.warn("Falling back to mock IPFS hash for development", { context: 'ipfs-upload' });
    return generateMockIPFSHash(JSON.stringify(metadata));
  }
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
