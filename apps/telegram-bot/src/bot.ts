/**
 * KSP Deals Telegram Bot
 * 
 * Posts deals to your Telegram channel automatically
 */

import { Telegraf } from 'telegraf'
import { PrismaClient } from '../../../packages/database/node_modules/@prisma/client'
import { generateDirectAffiliateLink } from '@ksp/shared'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || ''

if (!BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN')
}
if (!CHANNEL_ID) {
  throw new Error('Missing TELEGRAM_CHANNEL_ID')
}

const bot = new Telegraf(BOT_TOKEN)
const prisma = new PrismaClient()

// Affiliate link generator
const generateAffiliateLink = (sku: string) => generateDirectAffiliateLink(sku)

// Format deal message
function formatDealMessage(
  title: string,
  oldPrice: number,
  newPrice: number,
  sku: string,
  imageUrl?: string
): string {
  const savings = oldPrice - newPrice
  const percentOff = Math.round((savings / oldPrice) * 100)

  return `🔥 *ירידת מחיר\\!* 🔥

📦 ${escapeMarkdown(title)}

~~₪${oldPrice}~~ → *₪${newPrice}*
💥 חיסכון של ${percentOff}% \\(₪${savings}\\)\\!

⏰ *מלאי מוגבל\\!*`
}

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

// Post a deal to the channel
export async function postDeal(
  title: string,
  oldPrice: number,
  newPrice: number,
  sku: string,
  imageUrl?: string
) {
  const message = formatDealMessage(title, oldPrice, newPrice, sku, imageUrl)
  const affiliateLink = generateAffiliateLink(sku)
  
  // Big clickable button
  const keyboard = {
    inline_keyboard: [[
      { text: '🛒 לרכישה ב-KSP', url: affiliateLink }
    ]]
  }
  
  try {
    if (imageUrl) {
      // Post with image
      await bot.telegram.sendPhoto(CHANNEL_ID, imageUrl, {
        caption: message,
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard
      })
    } else {
      // Text only
      await bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard
      })
    }
    console.log(`✅ Posted deal: ${title}`)
    return true
  } catch (error) {
    console.error('❌ Failed to post:', error)
    return false
  }
}

// Post all pending alerts
export async function postPendingAlerts() {
  const alerts = await prisma.priceAlert.findMany({
    where: { 
      notified: false,
      type: 'price_drop'
    },
    include: {
      product: {
        include: {
          content: { where: { lang: 'he' } }
        }
      }
    },
    take: 5 // Max 5 at a time
  })

  console.log(`📢 Found ${alerts.length} pending alerts`)

  for (const alert of alerts) {
    const title = alert.product.content[0]?.title || alert.product.sku
    const oldPrice = alert.oldPrice || 0
    const newPrice = alert.newPrice || alert.product.priceCurrent
    
    const success = await postDeal(
      title,
      oldPrice,
      newPrice,
      alert.product.sku,
      alert.product.imageUrl || undefined
    )

    if (success) {
      // Mark as notified
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { notified: true }
      })
    }

    // Wait between posts to avoid spam
    await new Promise(r => setTimeout(r, 2000))
  }
}

// Bot commands
bot.command('start', (ctx) => {
  ctx.reply('👋 שלום! אני בוט המבצעים של KSP.\n\nהצטרפו לערוץ שלנו לקבלת מבצעים חמים!')
})

bot.command('deals', async (ctx) => {
  const products = await prisma.product.findMany({
    take: 5,
    orderBy: { priceCurrent: 'asc' },
    include: { content: { where: { lang: 'he' } } }
  })

  let message = '🔥 *המבצעים החמים שלנו:*\n\n'
  for (const p of products) {
    const title = p.content[0]?.title || p.sku
    message += `• ${title} \\- ₪${p.priceCurrent}\n`
  }

  ctx.reply(message, { parse_mode: 'MarkdownV2' })
})

// Start the bot
bot.launch()
console.log('🤖 Bot is running!')

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
