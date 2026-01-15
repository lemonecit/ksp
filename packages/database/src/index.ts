import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use Turso in production, local SQLite in development
function createPrismaClient() {
  try {
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const tursoToken = process.env.TURSO_AUTH_TOKEN
    
    // Only use Turso adapter in production with valid credentials
    if (process.env.NODE_ENV === 'production' && tursoUrl && tursoToken) {
      // Production: Use Turso with libsql client
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      })
      // @ts-ignore - Constructor signature varies between versions
      const adapter = new PrismaLibSql(libsql)
      // @ts-ignore - Type mismatch between adapter versions
      return new PrismaClient({ adapter })
    } else {
      // Development or build time: Use local SQLite or skip DB operations
      return new PrismaClient()
    }
  } catch (error) {
    console.warn('Failed to initialize Prisma Client:', error)
    // Return a mock client for build time
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'
