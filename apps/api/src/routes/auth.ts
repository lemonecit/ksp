import { FastifyPluginAsync } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const ADMIN_ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || ''

type AdminJwtPayload = {
  sub: string
  email: string
  name?: string
}

function requireEnv(value: string, key: string) {
  if (!value) throw new Error(`Missing ${key}`)
}

function signAdminJwt(payload: AdminJwtPayload): string {
  requireEnv(ADMIN_JWT_SECRET, 'ADMIN_JWT_SECRET')

  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  })
}

export function verifyAdminJwt(token: string): AdminJwtPayload {
  requireEnv(ADMIN_JWT_SECRET, 'ADMIN_JWT_SECRET')

  const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any
  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

  app.post<{ Body: { credential: string } }>(
    '/google',
    async (request, reply) => {
      requireEnv(GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID')
      const credential = request.body?.credential

      if (!credential) {
        return reply.status(400).send({ error: 'Missing credential' })
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })

      const payload = ticket.getPayload()
      const email = payload?.email?.toLowerCase()
      const sub = payload?.sub
      const name = payload?.name

      if (!email || !sub) {
        return reply.status(401).send({ error: 'Invalid Google token' })
      }

      if (ADMIN_ALLOWED_EMAILS.length > 0 && !ADMIN_ALLOWED_EMAILS.includes(email)) {
        return reply.status(403).send({ error: 'Email is not allowed' })
      }

      const token = signAdminJwt({ sub, email, name })
      return { token, email, name }
    }
  )

  app.get('/me', async (request, reply) => {
    const header = request.headers.authorization || ''
    const match = header.match(/^Bearer\s+(.+)$/i)

    if (!match) {
      return reply.status(401).send({ error: 'Missing Authorization header' })
    }

    try {
      const payload = verifyAdminJwt(match[1])
      return { email: payload.email, name: payload.name }
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  })
}
