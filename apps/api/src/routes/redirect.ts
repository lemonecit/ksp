import { FastifyPluginAsync } from 'fastify'
import { prisma, Platform, Language } from '@ksp/database'

const KSP_AFFILIATE_ID = process.env.KSP_AFFILIATE_ID || 'YOUR_ID'

/**
 * AFFILIATE REDIRECT ROUTE
 * 
 * This is the core of the tracking system.
 * Instead of linking directly to KSP, we go through this redirect
 * which logs the click and appends our affiliate tracking ID.
 * 
 * Flow:
 * 1. User clicks: smartbuy.co.il/go/123?channel=telegram&lang=en
 * 2. We log the click in revenue_tracking table
 * 3. We redirect to: ksp.co.il/item/123?uin=AFFILIATE_ID_clickId
 * 4. Later, KSP reports match our clickId to confirm sales
 */
export const redirectRoute: FastifyPluginAsync = async (app) => {
  
  app.get<{
    Params: { productId: string }
    Querystring: { channel?: string; lang?: string }
  }>('/:productId', async (request, reply) => {
    const { productId } = request.params
    const { channel = 'site', lang = 'he' } = request.query
    
    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    
    // Create tracking record
    const tracking = await prisma.revenueTracking.create({
      data: {
        productId,
        platform: channel as Platform,
        language: lang as Language,
        status: 'pending'
      }
    })
    
    // Build KSP URL with our affiliate tracking
    // The UIN format: AFFILIATE_ID_clickId
    // This allows us to match clicks when KSP sends their report
    const kspUrl = new URL(product.kspUrl)
    kspUrl.searchParams.set('uin', `${KSP_AFFILIATE_ID}_${tracking.id}`)
    
    // Log for debugging
    app.log.info({
      event: 'affiliate_click',
      productId,
      trackingId: tracking.id,
      platform: channel,
      language: lang,
      redirectUrl: kspUrl.toString()
    })
    
    // Redirect to KSP
    return reply.redirect(302, kspUrl.toString())
  })
}
