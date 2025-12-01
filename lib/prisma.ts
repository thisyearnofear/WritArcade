/**
 * Prisma client export for use in API routes
 * Re-exports from database.ts to keep import path consistent
 */

export { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth } from './database'
