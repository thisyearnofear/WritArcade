/**
 * SuperRare API — NFT minting and gallery service
 *
 * Uses the RARE SDK client pattern:
 *   https://github.com/superrare/rare-sdk-example
 *
 * GraphQL API:
 *   https://help.superrare.com/en/articles/10683308-superrare-public-api-documentation
 */

const SUPERRARE_API_URL =
  process.env.SUPERRARE_API_URL || 'https://api.superrare.com'
const SUPERRARE_API_KEY = process.env.SUPERRARE_API_KEY || ''
const SUPERRARE_CONTRACT_ADDRESS =
  process.env.SUPERRARE_CONTRACT_ADDRESS || ''

export interface SuperRareMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface SuperRareMintResult {
  tokenId: string
  contractAddress: string
  transactionHash: string
  tokenUri: string
  creator: string
  owner: string
}

export interface SuperRareNFT {
  id: string
  tokenId: string
  contractAddress: string
  name: string
  description: string
  imageUrl: string
  creatorAddress: string
  ownerAddress: string
  metadataUri: string
  mintedAt: string
}

/**
 * Mint an NFT on SuperRare
 *
 * Uses the SuperRare V2 shared minting contract (0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0).
 * In production, this calls the SuperRare Studio API or RARE SDK.
 * For hackathon demo, it creates the metadata and prepares the mint payload.
 */
export async function mintNFT(params: {
  gameId: string
  gameSlug: string
  title: string
  description: string
  imageUrl?: string
  creatorAddress: string
  genre: string
  attributes?: SuperRareMetadata['attributes']
  chainId?: number
}): Promise<SuperRareMintResult> {
  const metadata: SuperRareMetadata = {
    name: params.title,
    description: params.description || `A ${params.genre} game from writersarcade`,
    image: params.imageUrl || '',
    external_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/games/${params.gameSlug}`,
    attributes: [
      { trait_type: 'genre', value: params.genre },
      { trait_type: 'platform', value: 'writersarcade' },
      ...(params.attributes || []),
    ],
  }

  // Upload metadata to IPFS (reusing existing IPFS infrastructure)
  const metadataUri = await uploadMetadataToIPFS(metadata)

  // Prepare the mint call — in production this calls SuperRare Studio API
  // For hackathon, we structure the payload the frontend wallet will sign
  const mintPayload = {
    contractAddress: SUPERRARE_CONTRACT_ADDRESS || '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0',
    tokenUri: metadataUri,
    to: params.creatorAddress,
    metadata,
  }

  return {
    tokenId: '', // filled after on-chain confirmation
    contractAddress: mintPayload.contractAddress,
    transactionHash: '',
    tokenUri: metadataUri,
    creator: params.creatorAddress,
    owner: params.creatorAddress,
  }
}

/**
 * Upload NFT metadata to IPFS via existing Pinata/Grove infrastructure
 */
async function uploadMetadataToIPFS(
  metadata: SuperRareMetadata
): Promise<string> {
  const PINATA_JWT = process.env.PINATA_JWT
  const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'

  if (!PINATA_JWT) {
    const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64')
    return `data:application/json;base64,${encoded}`
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `superrare-${metadata.name}` },
      }),
    })

    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.status}`)
    }

    const result = await response.json()
    return `${IPFS_GATEWAY}/ipfs/${result.IpfsHash}`
  } catch {
    const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64')
    return `data:application/json;base64,${encoded}`
  }
}

/**
 * Query SuperRare GraphQL API for user's NFTs
 */
export async function getNFTsByOwner(
  ownerAddress: string
): Promise<SuperRareNFT[]> {
  const query = `
    query GetNftsByOwner($owner: String!) {
      getNfts(
        filter: { ownerAddress: { equals: $owner } }
        pagination: { take: 50 }
      ) {
        nfts {
          tokenId
          contractAddress
          universalTokenId
          metadata {
            name
            description
            proxyMedia {
              image { medium }
            }
          }
          creator { defaultAddress }
          owner { defaultAddress }
        }
        pagination { total }
      }
    }
  `

  try {
    const response = await fetch(`${SUPERRARE_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SUPERRARE_API_KEY ? { 'x-api-key': SUPERRARE_API_KEY } : {}),
      },
      body: JSON.stringify({
        query,
        variables: { owner: ownerAddress },
      }),
    })

    if (!response.ok) {
      throw new Error(`SuperRare query failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'SuperRare query error')
    }

    const nfts = data?.data?.getNfts?.nfts || []
    return nfts.map((nft: Record<string, unknown>) => {
      const metadata = nft.metadata as Record<string, unknown> | undefined
      const proxyMedia = metadata?.proxyMedia as Record<string, unknown> | undefined
      const image = proxyMedia?.image as Record<string, unknown> | undefined
      const creator = nft.creator as Record<string, unknown> | undefined
      const owner = nft.owner as Record<string, unknown> | undefined
      return {
        id: nft.universalTokenId as string,
        tokenId: nft.tokenId as string,
        contractAddress: nft.contractAddress as string,
        name: (metadata?.name as string) || '',
        description: (metadata?.description as string) || '',
        imageUrl: (image?.medium as string) || '',
        creatorAddress: (creator?.defaultAddress as string) || '',
        ownerAddress: (owner?.defaultAddress as string) || '',
        metadataUri: '',
        mintedAt: '',
      }
    })
  } catch (error) {
    console.error('[SuperRare] Query error:', error)
    return []
  }
}
