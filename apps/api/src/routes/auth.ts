import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-secret-key'

type AdminJwtPayload = {
  username: string
}

function signAdminJwt(payload: AdminJwtPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  })
}

export function verifyAdminJwt(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any
  return {
    username: decoded.username,
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  
  // Simple login
  app.post<{ Body: { username: string; password: string } }>(
    '/login',
    async (request, reply) => {
      const { username, password } = request.body

      if (!username || !password) {
        return reply.status(400).send({ error: 'Missing username or password' })
      }

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const token = signAdminJwt({ username })
      return { token, username }
    }
  )

  // Get current user
  app.get('/me', async (request, reply) => {
    const header = request.headers.authorization || ''
    const match = header.match(/^Bearer\s+(.+)$/i)

    if (!match) {
      return reply.status(401).send({ error: 'Missing Authorization header' })
    }

    try {
      const payload = verifyAdminJwt(match[1])
      return { username: payload.username }
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  })
}
