import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'path'
import fs from 'fs'
import { redirectRoute } from './routes/redirect'
import { productsRoute } from './routes/products'
import { revenueRoute } from './routes/revenue'
import { reportImportRoute } from './routes/report-import'
import alertsRoutes from './routes/alerts'
import scraperRoutes from './routes/scraper'
import telegramRoutes from './routes/telegram'
import { authRoutes } from './routes/auth'

const app = Fastify({ logger: true })

// Plugins
app.register(cors, { origin: true })
app.register(multipart)

// Serve admin panel
const adminDistPath = path.resolve(__dirname, '../../admin/dist')
console.log('Admin dist path:', adminDistPath)
app.register(fastifyStatic, {
  root: adminDistPath,
  prefix: '/'
})

// Routes
app.register(authRoutes, { prefix: '/api/auth' })
app.register(redirectRoute, { prefix: '/go' })
app.register(productsRoute, { prefix: '/api/products' })
app.register(revenueRoute, { prefix: '/api/revenue' })
app.register(reportImportRoute, { prefix: '/api/reports' })
app.register(alertsRoutes, { prefix: '/api' })
app.register(scraperRoutes, { prefix: '/api/scraper' })
app.register(telegramRoutes, { prefix: '/api/telegram' })

// Health check
app.get('/health', async () => ({ status: 'ok' }))

// Fallback to index.html for SPA
app.setNotFoundHandler((request, reply) => {
  const url = request.raw.url || ''
  if (url.startsWith('/api') || url.startsWith('/go') || url.startsWith('/health')) {
    return reply.status(404).send({ error: 'Not found' })
  }
  const indexPath = path.join(adminDistPath, 'index.html')
  const indexContent = fs.readFileSync(indexPath, 'utf-8')
  return reply.type('text/html').send(indexContent)
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
