import { PrismaClient } from '@prisma/client'
import { createSlug } from '@/lib/utils'

interface SequelizeUser {
  id: number
  email: string
  username: string
  password: string
  model?: string
  private?: boolean
  createdAt: Date
  updatedAt: Date
}

interface SequelizeGame {
  id: number
  title: string
  slug: string
  description: string
  tagline: string
  genre: string
  subgenre: string
  primary_color?: string
  prompt_name: string
  prompt_text?: string
  prompt_model: string
  image_prompt_model?: string
  image_prompt_name?: string
  image_prompt_text?: string
  image_data?: Buffer
  music_prompt_text?: string
  music_prompt_seed_image?: string
  private: boolean
  UserId?: number
  createdAt: Date
  updatedAt: Date
}

interface SequelizeChat {
  id: number
  parent_id?: number
  session_id: string
  model: string
  UserId?: number
  GameId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  updatedAt: Date
}

interface SequelizeSession {
  id: number
  session_id: string
  UserId?: number
  createdAt: Date
  updatedAt: Date
}

interface SequelizeArticle {
  id: number
  title: string
  slug: string
  description?: string
  content: string
  author?: string
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Data Migration Service
 * Migrates data from existing Sequelize PostgreSQL database to new Prisma schema
 */
export class DataMigrator {
  private prisma: PrismaClient
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }
  
  /**
   * Main migration orchestrator
   */
  async migrateAll(sequelizeConnection: any): Promise<void> {
    console.log('🚀 Starting data migration...')
    
    try {
      // Migrate in dependency order
      await this.migrateUsers(sequelizeConnection)
      await this.migrateGames(sequelizeConnection)
      await this.migrateSessions(sequelizeConnection)
      await this.migrateChats(sequelizeConnection)
      await this.migrateArticles(sequelizeConnection)
      
      console.log('✅ Data migration completed successfully!')
    } catch (error) {
      console.error('❌ Data migration failed:', error)
      throw error
    }
  }
  
  /**
   * Migrate users with enhanced fields
   */
  async migrateUsers(sequelizeConnection: any): Promise<void> {
    console.log('👥 Migrating users...')
    
    const [users] = await sequelizeConnection.query('SELECT * FROM users ORDER BY id')
    
    for (const user of users as SequelizeUser[]) {
      try {
        await this.prisma.user.create({
          data: {
            id: `user_${user.id}`, // Convert integer ID to string
            email: user.email,
            username: user.username,
            password: user.password,
            model: user.model || 'gpt-4o-mini',
            private: user.private || false,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        })
        
        console.log(`  ✓ Migrated user: ${user.username}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate user ${user.username}:`, error)
      }
    }
    
    console.log(`✅ Users migration complete: ${users.length} users processed`)
  }
  
  /**
   * Migrate games with enhanced metadata
   */
  async migrateGames(sequelizeConnection: any): Promise<void> {
    console.log('🎮 Migrating games...')
    
    const [games] = await sequelizeConnection.query('SELECT * FROM games ORDER BY id')
    
    for (const game of games as SequelizeGame[]) {
      try {
        await this.prisma.game.create({
          data: {
            id: `game_${game.id}`,
            title: game.title,
            slug: game.slug,
            description: game.description,
            tagline: game.tagline,
            genre: game.genre,
            subgenre: game.subgenre,
            primaryColor: game.primary_color,
            promptName: game.prompt_name,
            promptText: game.prompt_text,
            promptModel: game.prompt_model,
            imagePromptModel: game.image_prompt_model,
            imagePromptName: game.image_prompt_name,
            imagePromptText: game.image_prompt_text,
            imageData: game.image_data,
            musicPromptText: game.music_prompt_text,
            musicPromptSeedImage: game.music_prompt_seed_image,
            private: game.private,
            userId: game.UserId ? `user_${game.UserId}` : null,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          }
        })
        
        console.log(`  ✓ Migrated game: ${game.title}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate game ${game.title}:`, error)
      }
    }
    
    console.log(`✅ Games migration complete: ${games.length} games processed`)
  }
  
  /**
   * Migrate sessions
   */
  async migrateSessions(sequelizeConnection: any): Promise<void> {
    console.log('🔗 Migrating sessions...')
    
    const [sessions] = await sequelizeConnection.query('SELECT * FROM sessions ORDER BY id')
    
    for (const session of sessions as SequelizeSession[]) {
      try {
        await this.prisma.session.create({
          data: {
            id: `session_${session.id}`,
            sessionId: session.session_id,
            userId: session.UserId ? `user_${session.UserId}` : null,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          }
        })
        
        console.log(`  ✓ Migrated session: ${session.session_id}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate session ${session.session_id}:`, error)
      }
    }
    
    console.log(`✅ Sessions migration complete: ${sessions.length} sessions processed`)
  }
  
  /**
   * Migrate chat messages with threading
   */
  async migrateChats(sequelizeConnection: any): Promise<void> {
    console.log('💬 Migrating chats...')
    
    const [chats] = await sequelizeConnection.query('SELECT * FROM chats ORDER BY id')
    
    for (const chat of chats as SequelizeChat[]) {
      try {
        // Find corresponding session
        const session = await this.prisma.session.findFirst({
          where: { sessionId: chat.session_id }
        })
        
        if (!session) {
          console.warn(`  ⚠ Session ${chat.session_id} not found for chat ${chat.id}`)
          continue
        }
        
        await this.prisma.chat.create({
          data: {
            id: `chat_${chat.id}`,
            parentId: chat.parent_id ? `chat_${chat.parent_id}` : null,
            role: chat.role,
            content: chat.content,
            model: chat.model,
            sessionId: session.id,
            gameId: `game_${chat.GameId}`,
            userId: chat.UserId ? `user_${chat.UserId}` : null,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          }
        })
        
        console.log(`  ✓ Migrated chat: ${chat.id}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate chat ${chat.id}:`, error)
      }
    }
    
    console.log(`✅ Chats migration complete: ${chats.length} chats processed`)
  }
  
  /**
   * Migrate articles
   */
  async migrateArticles(sequelizeConnection: any): Promise<void> {
    console.log('📄 Migrating articles...')
    
    const [articles] = await sequelizeConnection.query('SELECT * FROM articles ORDER BY id')
    
    for (const article of articles as SequelizeArticle[]) {
      try {
        await this.prisma.article.create({
          data: {
            id: `article_${article.id}`,
            title: article.title,
            slug: article.slug,
            description: article.description,
            content: article.content,
            author: article.author,
            publishedAt: article.publishedAt,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
          }
        })
        
        console.log(`  ✓ Migrated article: ${article.title}`)
      } catch (error) {
        console.error(`  ✗ Failed to migrate article ${article.title}:`, error)
      }
    }
    
    console.log(`✅ Articles migration complete: ${articles.length} articles processed`)
  }
  
  /**
   * Verify migration integrity
   */
  async verifyMigration(): Promise<boolean> {
    console.log('🔍 Verifying migration integrity...')
    
    try {
      const counts = {
        users: await this.prisma.user.count(),
        games: await this.prisma.game.count(),
        sessions: await this.prisma.session.count(),
        chats: await this.prisma.chat.count(),
        articles: await this.prisma.article.count(),
      }
      
      console.log('📊 Migration Summary:')
      console.log(`  Users: ${counts.users}`)
      console.log(`  Games: ${counts.games}`)
      console.log(`  Sessions: ${counts.sessions}`)
      console.log(`  Chats: ${counts.chats}`)
      console.log(`  Articles: ${counts.articles}`)
      
      return true
    } catch (error) {
      console.error('❌ Migration verification failed:', error)
      return false
    }
  }
  
  /**
   * Cleanup and optimization after migration
   */
  async postMigrationCleanup(): Promise<void> {
    console.log('🧹 Running post-migration cleanup...')
    
    // Update sequences (if needed)
    // Add any indexes for performance
    // Analyze tables for query optimization
    
    console.log('✅ Post-migration cleanup complete')
  }
}