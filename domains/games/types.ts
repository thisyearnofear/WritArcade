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

  // Wordle-specific metadata
  wordleAnswer?: string

  // Attribution data - preserves source material author
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

  // Story Protocol IP registration (set after registerGameAsIP)
  storyIpId?: string

  // Access control
  private: boolean
  userId?: string

  // Monetization & Discovery
  playFee?: string
  featured?: boolean

  // NEW: Approval workflow & quality metrics
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  articleFidelityScore?: number // 0-100 semantic match
  approvedAt?: Date
  rejectionReason?: string

  // Timestamps
  createdAt: Date
  updatedAt: Date
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
  creatorWallet?: string  // Game creator's wallet (for attribution in NFT)
}

export interface GameplayOption {
  id: number
  text: string
}

export interface GameplayResponse {
  type: 'content' | 'options' | 'end'
  content?: string
  options?: GameplayOption[]
  chatId?: string
  parentId?: string
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