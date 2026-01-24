/**
 * Quick script to post a specific deal
 * Usage: npx tsx src/post-deal.ts
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

const generateAffiliateLink = (sku: string) => generateDirectAffiliateLink(sku)

async function postTopDeals() {
  console.log('📢 Posting top deals to Telegram...\n')

  // Get cheapest products as example deals
  const products = await prisma.product.findMany({
    take: 3,
    orderBy: { priceCurrent: 'asc' },
    include: { content: { where: { lang: 'he' } } }
  })

  for (const p of products) {
    const title = p.content[0]?.title || p.sku
    const link = generateAffiliateLink(p.sku)
    const escapedTitle = title.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
    
    const message = `🔥 *מבצע\\!*

📦 [${escapedTitle}](${link})

💰 *₪${p.priceCurrent}*`

    // Big clickable button
    const keyboard = {
      inline_keyboard: [[
        { text: '🛒 לרכישה ב-KSP', url: link }
      ]]
    }

    try {
      if (p.imageUrl) {
        await bot.telegram.sendPhoto(CHANNEL_ID, p.imageUrl, {
          caption: message,
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard
        })
      } else {
        await bot.telegram.sendMessage(CHANNEL_ID, message, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard
        })
      }
      console.log(`✅ Posted: ${title}`)
    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`)
    }

    // Wait between posts
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log('\n✨ Done!')
  process.exit(0)
}

postTopDeals()
