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