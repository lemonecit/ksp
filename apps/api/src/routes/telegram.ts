import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@ksp/database'
import { Telegraf } from 'telegraf'

/**
 * TELEGRAM API ROUTES
 * 
 * Manage Telegram bot posting and settings
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8126807418:AAEPb8GWZkA4QeZL05vq-TAdM9Kub5GGWgY'
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@KSPmivtzei'
const KSP_AFFILIATE_ID = '14887'

const bot = new Telegraf(BOT_TOKEN)

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

// Generate affiliate link
function generateAffiliateLink(sku: string): string {
  return `https://ksp.co.il/web/item/${sku}?appkey=${KSP_AFFILIATE_ID}`
}

export const telegramRoutes: FastifyPluginAsync = async (app) => {
  
  // Get post history
  app.get('/posts', async () => {
    const posts = await prisma.telegramPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    
    const stats = {
      totalPosts: await prisma.telegramPost.count(),
      sentToday: await prisma.telegramPost.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'sent'
        }
      }),
      failed: await prisma.telegramPost.count({ where: { status: 'failed' } })
    }
    
    return { posts, stats }
  })
  
  // Get settings
  app.get('/settings', async () => {
    let settings = await prisma.telegramSettings.findFirst({
      where: { id: 'default' }
    })
    
    if (!settings) {
      settings = await prisma.telegramSettings.create({
        data: {
          id: 'default',
          botToken: BOT_TOKEN,
          channelId: CHANNEL_ID,
          minDiscountPercent: 40,
          maxPostsPerDay: 10,
          scheduleTimes: '["10:00", "20:00"]'
        }
      })
    }
    
    // Reset daily counter if needed
    const today = new Date().setHours(0, 0, 0, 0)
    if (settings.lastResetAt < new Date(today)) {
      settings = await prisma.telegramSettings.update({
        where: { id: 'default' },
        data: {
          postsToday: 0,
          lastResetAt: new Date()
        }
      })
    }
    
    return {
      ...settings,
      scheduleTimes: JSON.parse(settings.scheduleTimes || '["10:00", "20:00"]')
    }
  })
  
  // Save settings
  app.post<{
    Body: {
      channelId?: string
      minDiscountPercent?: number
      maxPostsPerDay?: number
      scheduleEnabled?: boolean
    }
  }>('/settings', async (request) => {
    const { channelId, minDiscountPercent, maxPostsPerDay, scheduleEnabled } = request.body
    
    const settings = await prisma.telegramSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        botToken: BOT_TOKEN,
        channelId: channelId || CHANNEL_ID,
        minDiscountPercent: minDiscountPercent || 40,
        maxPostsPerDay: maxPostsPerDay || 10,
        scheduleEnabled: scheduleEnabled ?? true
      },
      update: {
        ...(channelId && { channelId }),
        ...(minDiscountPercent !== undefined && { minDiscountPercent }),
        ...(maxPostsPerDay !== undefined && { maxPostsPerDay }),
        ...(scheduleEnabled !== undefined && { scheduleEnabled })
      }
    })
    
    return settings
  })
  
  // Post a single alert to Telegram
  app.post<{
    Body: { alertId: string }
  }>('/post', async (request, reply) => {
    const { alertId } = request.body
    
    // Get alert with product
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: {
        product: {
          include: { content: { where: { lang: 'he' } } }
        }
      }
    })
    
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' })
    }
    
    const settings = await prisma.telegramSettings.findFirst({ where: { id: 'default' } })
    const title = alert.product.content[0]?.title || alert.product.sku
    const oldPrice = alert.oldPrice || 0
    const newPrice = alert.newPrice || alert.product.priceCurrent
    const percentOff = alert.percentChange || Math.round((1 - newPrice / oldPrice) * 100)
    const affiliateLink = generateAffiliateLink(alert.product.sku)
    
    // Format message
    const savings = oldPrice - newPrice
    const message = `🔥 *ירידת מחיר\\!* 🔥

📦 ${escapeMarkdown(title)}

~~₪${oldPrice}~~ → *₪${newPrice}*
💥 חיסכון של ${percentOff}% \\(₪${Math.round(savings)}\\)\\!

⏰ *מלאי מוגבל\\!*`

    const keyboard = {
      inline_keyboard: [[
        { text: '🛒 לרכישה ב-KSP', url: affiliateLink }
      ]]
    }
    
    try {
      const channelId = settings?.channelId || CHANNEL_ID
      let messageId = ''
      
      if (alert.product.imageUrl) {
        const result = await bot.telegram.sendPhoto(channelId, alert.product.imageUrl, {
          caption: message,
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard
        })
        messageId = result.message_id.toString()
      } else {
        const result = await bot.telegram.sendMessage(channelId, message, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard
        })
        messageId = result.message_id.toString()
      }
      
      // Log the post
      await prisma.telegramPost.create({
        data: {
          productId: alert.productId,
          alertId: alert.id,
          title,
          oldPrice,
          newPrice,
          percentOff,
          imageUrl: alert.product.imageUrl,
          affiliateLink,
          status: 'sent',
          messageId
        }
      })
      
      // Mark alert as sent
      await prisma.priceAlert.update({
        where: { id: alertId },
        data: { status: 'sent', sentAt: new Date(), notified: true }
      })
      
      // Update daily counter
      if (settings) {
        await prisma.telegramSettings.update({
          where: { id: 'default' },
          data: {
            postsToday: { increment: 1 },
            lastPostAt: new Date()
          }
        })
      }
      
      return { success: true, messageId }
    } catch (error: any) {
      app.log.error(error)
      
      // Log failed post
      await prisma.telegramPost.create({
        data: {
          productId: alert.productId,
          alertId: alert.id,
          title,
          oldPrice,
          newPrice,
          percentOff,
          imageUrl: alert.product.imageUrl,
          affiliateLink,
          status: 'failed',
          error: error.message
        }
      })
      
      return reply.status(500).send({ error: error.message })
    }
  })
  
  // Post all pending alerts that meet criteria
  app.post('/post-pending', async () => {
    const settings = await prisma.telegramSettings.findFirst({ where: { id: 'default' } })
    const minDiscount = settings?.minDiscountPercent || 40
    const maxPosts = settings?.maxPostsPerDay || 10
    const postsToday = settings?.postsToday || 0
    
    if (postsToday >= maxPosts) {
      return { success: false, message: 'Daily limit reached', posted: 0 }
    }
    
    const remaining = maxPosts - postsToday
    
    const alerts = await prisma.priceAlert.findMany({
      where: {
        status: 'pending',
        type: 'price_drop',
        percentChange: { gte: minDiscount }
      },
      include: {
        product: {
          include: { content: { where: { lang: 'he' } } }
        }
      },
      take: remaining,
      orderBy: { percentChange: 'desc' }
    })
    
    let posted = 0
    
    for (const alert of alerts) {
      try {
        const title = alert.product.content[0]?.title || alert.product.sku
        const oldPrice = alert.oldPrice || 0
        const newPrice = alert.newPrice || alert.product.priceCurrent
        const percentOff = alert.percentChange || 0
        const affiliateLink = generateAffiliateLink(alert.product.sku)
        
        const savings = oldPrice - newPrice
        const message = `🔥 *ירידת מחיר\\!* 🔥

📦 ${escapeMarkdown(title)}

~~₪${oldPrice}~~ → *₪${newPrice}*
💥 חיסכון של ${Math.round(percentOff)}% \\(₪${Math.round(savings)}\\)\\!

⏰ *מלאי מוגבל\\!*`

        const keyboard = {
          inline_keyboard: [[
            { text: '🛒 לרכישה ב-KSP', url: affiliateLink }
          ]]
        }
        
        const channelId = settings?.channelId || CHANNEL_ID
        let messageId = ''
        
        if (alert.product.imageUrl) {
          const result = await bot.telegram.sendPhoto(channelId, alert.product.imageUrl, {
            caption: message,
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard
          })
          messageId = result.message_id.toString()
        } else {
          const result = await bot.telegram.sendMessage(channelId, message, {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard
          })
          messageId = result.message_id.toString()
        }
        
        // Log success
        await prisma.telegramPost.create({
          data: {
            productId: alert.productId,
            alertId: alert.id,
            title,
            oldPrice,
            newPrice,
            percentOff,
            imageUrl: alert.product.imageUrl,
            affiliateLink,
            status: 'sent',
            messageId
          }
        })
        
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { status: 'sent', sentAt: new Date(), notified: true }
        })
        
        posted++
        
        // Wait between posts
        await new Promise(r => setTimeout(r, 2000))
      } catch (error: any) {
        app.log.error(`Failed to post alert ${alert.id}:`, error)
      }
    }
    
    // Update counter
    if (posted > 0) {
      await prisma.telegramSettings.update({
        where: { id: 'default' },
        data: {
          postsToday: { increment: posted },
          lastPostAt: new Date()
        }
      })
    }
    
    return { success: true, posted, remaining: remaining - posted }
  })
}

export default telegramRoutes
