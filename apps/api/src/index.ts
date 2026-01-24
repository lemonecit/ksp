import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import '@fastify/static'
import path from 'path'
import { redirectRoute } from './routes/redirect'
import { authRoutes, verifyAdminJwt } from './routes/auth'
import { productsRoute } from './routes/products'
import { revenueRoute } from './routes/revenue'
import { reportImportRoute } from './routes/report-import'
import alertsRoutes from './routes/alerts'
import scraperRoutes from './routes/scraper'
import telegramRoutes from './routes/telegram'

const app = Fastify({ logger: true })

// Plugins
app.register(cors, { origin: true })
app.register(multipart)

app.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url || ''

  if (!url.startsWith('/api')) return
  if (url.startsWith('/api/auth')) return

  const header = request.headers.authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  try {
    const payload = verifyAdminJwt(match[1])
    ;(request as any).admin = payload
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
})

// Routes
app.register(redirectRoute, { prefix: '/go' })
app.register(authRoutes, { prefix: '/api/auth' })
app.register(productsRoute, { prefix: '/api/products' })
app.register(revenueRoute, { prefix: '/api/revenue' })
app.register(reportImportRoute, { prefix: '/api/reports' })
app.register(alertsRoutes, { prefix: '/api' })
app.register(scraperRoutes, { prefix: '/api/scraper' })
app.register(telegramRoutes, { prefix: '/api/telegram' })

// Health check
app.get('/health', async () => ({ status: 'ok' }))

const adminDistDir = path.resolve(__dirname, '../../admin/dist')
app.register(fastifyStatic, {
  root: adminDistDir,
})

app.setNotFoundHandler(async (request, reply) => {
  const url = request.raw.url || ''
  if (url.startsWith('/api') || url.startsWith('/go') || url.startsWith('/health')) {
    return reply.status(404).send({ error: 'Not found' })
  }

  return reply.sendFile('index.html')
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 API running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
