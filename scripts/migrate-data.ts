#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { DataMigrator } from '@/lib/migrations/data-migrator'
import { createConnection } from 'mysql2/promise'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Migration script to transfer data from old Sequelize database to new Prisma setup
 * 
 * Usage: npm run migrate:data
 */

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Starting WritArcade data migration...')
    
    // Connect to old database (adjust connection as needed)
    const oldDbConfig = {
      host: process.env.OLD_DB_HOST || 'localhost',
      user: process.env.OLD_DB_USER || 'postgres',
      password: process.env.OLD_DB_PASSWORD || '',
      database: process.env.OLD_DB_NAME || 'infinityarcade',
      port: parseInt(process.env.OLD_DB_PORT || '5432'),
    }
    
    console.log(`📡 Connecting to old database: ${oldDbConfig.database}`)
    
    // For PostgreSQL, we'll use a different approach
    const { Pool } = require('pg')
    const oldDb = new Pool({
      host: oldDbConfig.host,
      user: oldDbConfig.user,
      password: oldDbConfig.password,
      database: oldDbConfig.database,
      port: oldDbConfig.port,
    })
    
    // Test connection
    try {
      await oldDb.query('SELECT 1')
      console.log('✅ Connected to old database')
    } catch (error) {
      console.error('❌ Failed to connect to old database:', error)
      process.exit(1)
    }
    
    // Initialize migrator
    const migrator = new DataMigrator(prisma)
    
    // Run migration
    await migrator.migrateAll(oldDb)
    
    // Verify migration
    const isValid = await migrator.verifyMigration()
    if (!isValid) {
      throw new Error('Migration verification failed')
    }
    
    // Post-migration cleanup
    await migrator.postMigrationCleanup()
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error)
      process.exit(1)
    })
}

export default main