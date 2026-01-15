import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'

export const productsRoute: FastifyPluginAsync = async (app) => {
  
  // Get all products with pagination
  app.get<{
    Querystring: { page?: string; limit?: string; category?: string; lang?: string }
  }>('/', async (request) => {
    const { 
      page = '1', 
      limit = '20', 
      category,
      lang = 'he'
    } = request.query
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: parseInt(limit),
        where: category ? { category } : undefined,
        include: {
          content: {
            where: { lang: lang as any }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.product.count({
        where: category ? { category } : undefined
      })
    ])
    
    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  })
  
  // Get single product by ID
  app.get<{
    Params: { id: string }
    Querystring: { lang?: string }
  }>('/:id', async (request, reply) => {
    const { id } = request.params
    const { lang = 'he' } = request.query
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        content: {
          where: { lang: lang as any }
        }
      }
    })
    
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    
    return product
  })
  
  // Get categories
  app.get('/categories', async () => {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { category: true }
    })
    
    return categories.map(c => ({
      name: c.category,
      count: c._count.category
    }))
  })
}
