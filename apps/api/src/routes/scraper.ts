import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * SCRAPER API ROUTES
 * 
 * Endpoints to trigger scraping from admin UI
 * The actual scraper runs in apps/scraper package
 */

export const scraperRoutes: FastifyPluginAsync = async (app) => {
  
  // Run full scraper (calls the scraper package)
  app.post('/run', async (request, reply) => {
    try {
      app.log.info('Starting scraper...')
      
      // Run the scraper package
      const { stdout, stderr } = await execAsync('npm run scrape', {
        cwd: 'F:/ksp',
        timeout: 300000 // 5 min timeout
      })
      
      app.log.info(stdout)
      if (stderr) app.log.warn(stderr)
      
      // Get updated stats
      const [totalProducts, recentProducts] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        })
      ])
      
      return {
        success: true,
        message: 'Scraper completed',
        totalProducts,
        recentlyUpdated: recentProducts,
        output: stdout.substring(0, 500)
      }
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({
        success: false,
        message: error.message || 'Scraper failed',
        error: error.stderr || error.message
      })
    }
  })
  
  // Scrape single URL
  app.post<{
    Body: { url: string }
  }>('/single', async (request, reply) => {
    const { url } = request.body
    
    if (!url || !url.includes('ksp.co.il')) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid KSP URL'
      })
    }
    
    try {
      // Extract SKU from URL
      const skuMatch = url.match(/\/item\/(\d+)/)
      if (!skuMatch) {
        return reply.status(400).send({
          success: false,
          message: 'Could not extract product ID from URL'
        })
      }
      
      const sku = skuMatch[1]
      
      // For now, just return info - full scraping would need playwright
      return {
        success: true,
        message: `Would scrape product ${sku}`,
        sku,
        url
      }
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Failed to scrape URL'
      })
    }
  })
  
  // Run translator
  app.post('/translate', async (request, reply) => {
    try {
      // Get products without English content
      const products = await prisma.product.findMany({
        where: {
          content: {
            none: { lang: 'en' }
          }
        },
        include: {
          content: {
            where: { lang: 'he' }
          }
        },
        take: 10 // Limit to 10 at a time
      })
      
      if (products.length === 0) {
        return {
          success: true,
          translated: 0,
          message: 'No products need translation'
        }
      }
      
      // For now, create simple English content (would use OpenAI in production)
      let translated = 0
      
      for (const product of products) {
        const hebrewContent = product.content[0]
        if (!hebrewContent) continue
        
        // Simple translation placeholder - in production use OpenAI
        const englishTitle = hebrewContent.title // Would translate
        const englishSlug = hebrewContent.slug.replace('he-', 'en-')
        
        await prisma.content.create({
          data: {
            productId: product.id,
            lang: 'en',
            title: englishTitle,
            description: hebrewContent.description,
            slug: englishSlug
          }
        })
        
        translated++
      }
      
      return {
        success: true,
        translated,
        message: `Translated ${translated} products`
      }
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({
        success: false,
        message: error.message || 'Translation failed'
      })
    }
  })
  
  // Get scraper status
  app.get('/status', async () => {
    const [totalProducts, lastUpdated] = await Promise.all([
      prisma.product.count(),
      prisma.product.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      })
    ])
    
    return {
      totalProducts,
      lastUpdated: lastUpdated?.updatedAt || null
    }
  })
}

export default scraperRoutes
