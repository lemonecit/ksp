import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'

export const revenueRoute: FastifyPluginAsync = async (app) => {
  
  // Dashboard stats
  app.get('/stats', async () => {
    const [
      totalClicks,
      confirmedSales,
      totalRevenue,
      platformStats,
      languageStats
    ] = await Promise.all([
      // Total clicks
      prisma.revenueTracking.count(),
      
      // Confirmed sales
      prisma.revenueTracking.count({
        where: { status: 'confirmed' }
      }),
      
      // Total revenue
      prisma.revenueTracking.aggregate({
        where: { status: 'confirmed' },
        _sum: { commission: true }
      }),
      
      // Stats by platform
      prisma.revenueTracking.groupBy({
        by: ['platform'],
        _count: { id: true },
        _sum: { commission: true }
      }),
      
      // Stats by language
      prisma.revenueTracking.groupBy({
        by: ['language'],
        _count: { id: true },
        _sum: { commission: true }
      })
    ])
    
    const revenue = totalRevenue._sum.commission?.toNumber() || 0
    
    // Calculate EPC (Earnings Per Click)
    const epc = totalClicks > 0 ? revenue / totalClicks : 0
    
    return {
      overview: {
        totalClicks,
        confirmedSales,
        totalRevenue: revenue,
        epc: epc.toFixed(2),
        conversionRate: totalClicks > 0 
          ? ((confirmedSales / totalClicks) * 100).toFixed(2) + '%'
          : '0%'
      },
      byPlatform: platformStats.map(p => ({
        platform: p.platform,
        clicks: p._count.id,
        revenue: p._sum.commission?.toNumber() || 0
      })),
      byLanguage: languageStats.map(l => ({
        language: l.language,
        clicks: l._count.id,
        revenue: l._sum.commission?.toNumber() || 0
      }))
    }
  })
  
  // Recent clicks/transactions
  app.get<{
    Querystring: { page?: string; limit?: string; status?: string }
  }>('/transactions', async (request) => {
    const { page = '1', limit = '50', status } = request.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const transactions = await prisma.revenueTracking.findMany({
      skip,
      take: parseInt(limit),
      where: status ? { status: status as any } : undefined,
      include: {
        product: {
          include: {
            content: { where: { lang: 'he' } }
          }
        }
      },
      orderBy: { clickedAt: 'desc' }
    })
    
    return transactions
  })
  
  // Category ROI
  app.get('/category-roi', async () => {
    const categories = await prisma.product.findMany({
      select: {
        category: true,
        clicks: {
          select: {
            status: true,
            commission: true
          }
        }
      }
    })
    
    // Aggregate by category
    const categoryMap = new Map<string, { clicks: number; sales: number; revenue: number }>()
    
    for (const product of categories) {
      const current = categoryMap.get(product.category) || { clicks: 0, sales: 0, revenue: 0 }
      
      for (const click of product.clicks) {
        current.clicks++
        if (click.status === 'confirmed') {
          current.sales++
          current.revenue += click.commission?.toNumber() || 0
        }
      }
      
      categoryMap.set(product.category, current)
    }
    
    return Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        ...stats,
        conversionRate: stats.clicks > 0 
          ? ((stats.sales / stats.clicks) * 100).toFixed(2) + '%'
          : '0%',
        epc: stats.clicks > 0 
          ? (stats.revenue / stats.clicks).toFixed(2)
          : '0'
      }))
      .sort((a, b) => b.revenue - a.revenue)
  })
}
