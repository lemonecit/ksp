import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'

const alertsRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /api/alerts - List all alerts
  fastify.get<{
    Querystring: { status?: string; type?: string; limit?: string }
  }>('/alerts', async (request, reply) => {
    const { status, type, limit = '50' } = request.query
    
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type
    
    const alerts = await prisma.priceAlert.findMany({
      where,
      include: {
        product: {
          include: {
            content: {
              where: { lang: 'he' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })
    
    // Get counts by status
    const [pendingCount, sentCount, totalDrops] = await Promise.all([
      prisma.priceAlert.count({ where: { status: 'pending' } }),
      prisma.priceAlert.count({ where: { status: 'sent' } }),
      prisma.priceAlert.count({ where: { type: 'price_drop' } }),
    ])
    
    return {
      alerts: alerts.map(a => ({
        ...a,
        productTitle: a.product.content[0]?.title || a.product.sku,
        productImage: a.product.imageUrl,
        productSku: a.product.sku,
      })),
      stats: {
        pending: pendingCount,
        sent: sentCount,
        totalDrops,
      }
    }
  })
  
  // GET /api/alerts/pending - Get pending alerts for notifications
  fastify.get('/alerts/pending', async (request, reply) => {
    const alerts = await prisma.priceAlert.findMany({
      where: { status: 'pending' },
      include: {
        product: {
          include: {
            content: {
              where: { lang: 'he' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return alerts.map(a => ({
      id: a.id,
      type: a.type,
      productId: a.productId,
      productTitle: a.product.content[0]?.title || a.product.sku,
      productImage: a.product.imageUrl,
      productSku: a.product.sku,
      productUrl: a.product.kspUrl,
      oldPrice: a.oldPrice,
      newPrice: a.newPrice,
      percentChange: a.percentChange,
      createdAt: a.createdAt,
      affiliateLink: `https://smartbuy.co.il/go/${a.productId}`,
    }))
  })
  
  // POST /api/alerts/:id/mark-sent - Mark alert as sent
  fastify.post<{
    Params: { id: string }
  }>('/alerts/:id/mark-sent', async (request, reply) => {
    const { id } = request.params
    
    await prisma.priceAlert.update({
      where: { id },
      data: { 
        status: 'sent',
        sentAt: new Date()
      }
    })
    
    return { success: true }
  })
  
  // POST /api/alerts/:id/dismiss - Dismiss alert
  fastify.post<{
    Params: { id: string }
  }>('/alerts/:id/dismiss', async (request, reply) => {
    const { id } = request.params
    
    await prisma.priceAlert.update({
      where: { id },
      data: { status: 'dismissed' }
    })
    
    return { success: true }
  })
  
  // POST /api/alerts/mark-all-sent - Mark all pending as sent
  fastify.post('/alerts/mark-all-sent', async (request, reply) => {
    const result = await prisma.priceAlert.updateMany({
      where: { status: 'pending' },
      data: { 
        status: 'sent',
        sentAt: new Date()
      }
    })
    
    return { success: true, count: result.count }
  })
  
  // GET /api/alerts/stats - Get alert statistics
  fastify.get('/alerts/stats', async (request, reply) => {
    const [
      totalAlerts,
      pendingAlerts,
      priceDrops,
      avgDrop,
      todayAlerts
    ] = await Promise.all([
      prisma.priceAlert.count(),
      prisma.priceAlert.count({ where: { status: 'pending' } }),
      prisma.priceAlert.count({ where: { type: 'price_drop' } }),
      prisma.priceAlert.aggregate({
        where: { type: 'price_drop' },
        _avg: { percentChange: true }
      }),
      prisma.priceAlert.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])
    
    return {
      total: totalAlerts,
      pending: pendingAlerts,
      priceDrops,
      avgDropPercent: Math.abs(avgDrop._avg.percentChange || 0).toFixed(1),
      today: todayAlerts
    }
  })
}

export default alertsRoutes
