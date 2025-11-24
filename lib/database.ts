import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database connection helper
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Database disconnection helper
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database is healthy' }
  } catch (error) {
    return { healthy: false, message: `Database error: ${error}` }
  }
}