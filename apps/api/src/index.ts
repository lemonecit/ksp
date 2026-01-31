import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
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
