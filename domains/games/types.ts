// Core game types - consolidating from existing models
export interface Game {
  id: string
  title: string
  slug: string
  description: string
  tagline: string
  genre: string
  subgenre: string
  primaryColor?: string
  
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
  
  // Access control
  private: boolean
  userId?: string
  
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
  genre?: 'horror' | 'comedy' | 'mystery'
  model?: string
}

export interface AssetGenerationResponse {
  title: string
  description: string
  characters: CharacterProfile[]
  storyBeats: StoryBeat[]
  gameMechanics: GameMechanic[]
  visualGuidelines: VisualGuideline
}