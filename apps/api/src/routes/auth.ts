import { FastifyPluginAsync } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { prisma } from '@ksp/database'
import { authenticator } from 'otplib'
import * as QRCode from 'qrcode'

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

type Pre2faJwtPayload = AdminJwtPayload & {
  typ: 'pre2fa'
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

function signPre2faJwt(payload: AdminJwtPayload): string {
  requireEnv(ADMIN_JWT_SECRET, 'ADMIN_JWT_SECRET')

  return jwt.sign({ ...payload, typ: 'pre2fa' } satisfies Pre2faJwtPayload, ADMIN_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '10m',
  })
}

function verifyPre2faJwt(token: string): AdminJwtPayload {
  requireEnv(ADMIN_JWT_SECRET, 'ADMIN_JWT_SECRET')

  const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any
  if (decoded?.typ !== 'pre2fa') throw new Error('Invalid pre2fa token')
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

      const adminUser = await prisma.adminUser.upsert({
        where: { email },
        create: { email, name, totpEnabled: false },
        update: { name },
      })

      if (adminUser.totpEnabled) {
        const pre2faToken = signPre2faJwt({ sub, email, name })
        return { requires2fa: true, pre2faToken, email, name }
      }

      const token = signAdminJwt({ sub, email, name })
      return { token, email, name, totpEnabled: false }
    }
  )

  app.get('/2fa/setup', async (request, reply) => {
    const header = request.headers.authorization || ''
    const match = header.match(/^Bearer\s+(.+)$/i)
    if (!match) return reply.status(401).send({ error: 'Missing Authorization header' })

    let payload: AdminJwtPayload
    try {
      payload = verifyAdminJwt(match[1])
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    const email = payload.email.toLowerCase()
    const adminUser = await prisma.adminUser.upsert({
      where: { email },
      create: { email, name: payload.name, totpEnabled: false },
      update: { name: payload.name },
    })

    if (adminUser.totpEnabled && adminUser.totpSecret) {
      return { enabled: true }
    }

    const secret = authenticator.generateSecret()
    await prisma.adminUser.update({
      where: { email },
      data: { totpSecret: secret, totpEnabled: false },
    })

    const issuer = 'ksp-admin'
    const label = email
    const otpauthUrl = authenticator.keyuri(label, issuer, secret)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

    return { enabled: false, otpauthUrl, qrDataUrl }
  })

  app.post<{ Body: { code: string } }>('/2fa/enable', async (request, reply) => {
    const header = request.headers.authorization || ''
    const match = header.match(/^Bearer\s+(.+)$/i)
    if (!match) return reply.status(401).send({ error: 'Missing Authorization header' })

    let payload: AdminJwtPayload
    try {
      payload = verifyAdminJwt(match[1])
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    const code = (request.body?.code || '').trim().replace(/\s+/g, '')
    if (!code) return reply.status(400).send({ error: 'Missing code' })

    const email = payload.email.toLowerCase()
    const adminUser = await prisma.adminUser.findUnique({ where: { email } })

    if (!adminUser?.totpSecret) {
      return reply.status(400).send({ error: '2FA not initialized' })
    }

    const ok = authenticator.verify({ token: code, secret: adminUser.totpSecret })
    if (!ok) return reply.status(401).send({ error: 'Invalid code' })

    await prisma.adminUser.update({
      where: { email },
      data: { totpEnabled: true },
    })

    return { enabled: true }
  })

  app.post<{ Body: { pre2faToken: string; code: string } }>('/2fa/login', async (request, reply) => {
    const pre2faToken = request.body?.pre2faToken
    const code = (request.body?.code || '').trim().replace(/\s+/g, '')

    if (!pre2faToken) return reply.status(400).send({ error: 'Missing pre2faToken' })
    if (!code) return reply.status(400).send({ error: 'Missing code' })

    let payload: AdminJwtPayload
    try {
      payload = verifyPre2faJwt(pre2faToken)
    } catch {
      return reply.status(401).send({ error: 'Invalid pre2fa token' })
    }

    const email = payload.email.toLowerCase()
    const adminUser = await prisma.adminUser.findUnique({ where: { email } })

    if (!adminUser?.totpEnabled || !adminUser.totpSecret) {
      return reply.status(400).send({ error: '2FA not enabled' })
    }

    const ok = authenticator.verify({ token: code, secret: adminUser.totpSecret })
    if (!ok) return reply.status(401).send({ error: 'Invalid code' })

    const token = signAdminJwt({ sub: payload.sub, email, name: payload.name })
    return { token, email, name: payload.name }
  })

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
