// Core game types - consolidating from existing models
export type GameMode = 'story' | 'wordle'

export interface Game {
  id: string
  title: string
  slug: string
  description: string
  tagline: string
  genre: string
  subgenre: string
  primaryColor?: string
  mode?: GameMode

  // AI Generation metadata
  promptName: string
  promptText?: string
  promptModel: string

  // Visual assets
  imageUrl?: string
  imagePromptModel?: string
  imagePromptName?: string
  imagePromptText?: string
  imageData?: Buffer

  // Audio assets
  musicPromptText?: string
  musicPromptSeedImage?: string

  // Mini App specific
  articleUrl?: string
  articleContext?: string
  writerCoinId?: string
  difficulty?: string

  // Wordle — answer stored in CDR vault, not plaintext in DB
  wordleAnswerVaultUuid?: string

  // Story CDR: Vaulted prompt for Confidential IP
  promptVaultUuid?: string

  // Attribution data - preserves source material author
  ownerWallet?: string
  ownershipSource?: 'payment_wallet' | 'siwe_user' | 'legacy_creator_wallet' | 'credits_user' | 'free_demo'
  creatorWallet?: string
  authorWallet?: string
  authorParagraphUsername?: string
  publicationName?: string
  publicationSummary?: string
  subscriberCount?: number
  articlePublishedAt?: Date

  // NFT minting
  nftTokenId?: string
  nftTransactionHash?: string
  nftMintedAt?: Date
  nftContractAddress?: string
  nftChainId?: number
  nftMetadataUri?: string
  gameMetadataUri?: string
  writerMintReceipt?: {
    writer: string
    writerShare: string
    symbol: string
  }

  // Saved artifact panels derived from completed playthrough history.
  savedPanels?: SavedGamePanel[]
  artifactManifestUri?: string
  artifactSavedAt?: Date

  // Story Protocol IP registration (set after registerGameAsIP)
  storyIpId?: string
  storyRegistrationTxHash?: string
  storyRegisteredAt?: Date

  // Story CDR lifecycle metadata
  cdrReadConditionType?: string
  cdrVaultedAt?: Date

  // Access control
  private: boolean
  userId?: string
  paymentId?: string

  // Monetization & Discovery
  playFee?: string
  featured?: boolean
  playCount?: number  // Number of times game sessions have completed
  lastPlayedAt?: Date // Last time the game was played

  // NEW: Approval workflow & quality metrics
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  articleFidelityScore?: number // 0-100 semantic match
  approvedAt?: Date
  rejectionReason?: string

  // Lit Protocol: NFT-gated secret panel
  secretPanelCiphertext?: string
  secretPanelDataHash?: string
  secretPanelImagePrompt?: string
  secretPanelGenerated?: boolean

  // Hypercerts: Impact certificate
  hypercertUri?: string
  hypercertCid?: string

  // SuperRare NFT collectible fields
  superrareTokenId?: string
  superrareContract?: string
  superrareMintedAt?: Date

  // Video upsell status
  videoUpsellStatus?: 'idle' | 'pending' | 'completed' | 'failed'
  videoUpsoldAt?: Date

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface SavedGamePanel {
  id: string
  panelNumber: number
  narrativeText: string
  imageUrl?: string
  imageModel?: string
  userChoice?: string
  audioUrl?: string
  createdAt: Date
}

export interface GameSession {
  id: string
  gameId: string
  userId?: string
  sessionId: string
  status: 'active' | 'completed' | 'abandoned'
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  sessionId: string
  gameId: string
  userId?: string
  parentId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string
  createdAt: Date
}

export interface GameGenerationRequest {
  promptText?: string
  url?: string
  customization?: {
    genre?: 'horror' | 'comedy' | 'mystery'
    difficulty?: 'easy' | 'hard'
  }
  payment?: {
    writerCoinId?: string
  }
  model?: string
  promptName?: string
  private?: boolean
  // Optional: different game modes (default is "story")
  mode?: GameMode
}

export interface GameGenerationResponse {
  title: string
  description: string
  tagline: string
  genre: string
  subgenre: string
  primaryColor: string
  promptModel: string
  promptName: string
  promptText?: string
  // Optional game mode metadata ("story" | "wordle")
  mode?: GameMode
  ownerWallet?: string
  ownershipSource?: 'payment_wallet' | 'siwe_user' | 'legacy_creator_wallet' | 'credits_user' | 'free_demo'
  creatorWallet?: string
  paymentId?: string
  imageUrl?: string | null
  wordleAnswerVaultUuid?: string
  promptVaultUuid?: string
}

export interface GameplayOption {
  id: number
  text: string
}

export interface GameplayResponse {
  type: 'content' | 'options' | 'end' | 'error'
  content?: string
  options?: GameplayOption[]
  chatId?: string
  parentId?: string
  error?: string
}

// ============================================================================
// Asset Generation Types (Sprint 1: Asset Marketplace)
// ============================================================================

export interface CharacterProfile {
  name: string
  role: string
  personality: string
  motivation: string
  appearance: string
}

export interface StoryBeat {
  title: string
  description: string
  keyConflict: string
  emotionalTone: string
}

export interface GameMechanic {
  name: string
  description: string
  mechanics: string[]
  consequence: string
}

export interface VisualGuideline {
  colorPalette: string[]
  artStyle: string
  atmosphere: string
  symbolism: string
}

export interface AssetGenerationRequest {
  url?: string
  promptText?: string
  genre?: string
  model?: string
}

export interface AssetRelationship {
  source: {
    type: 'character' | 'mechanic' | 'story'
    index: number
  }
  target: {
    type: 'character' | 'mechanic' | 'story'
    index: number
  }
  relationshipType: 'activates' | 'uses' | 'triggers' | 'requires'
}

export interface AssetGenerationResponse {
  title: string
  description: string
  characters: CharacterProfile[]
  storyBeats: StoryBeat[]
  gameMechanics: GameMechanic[]
  visualGuidelines?: VisualGuideline
  relationships?: AssetRelationship[]
}
