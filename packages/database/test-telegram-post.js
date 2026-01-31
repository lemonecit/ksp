/**
 * Test script to post a product to Telegram
 * Usage: node test-telegram-post.js
 */

const { Telegraf } = require('telegraf')
const { PrismaClient } = require('@prisma/client')

const BOT_TOKEN = '8126807418:AAEPb8GWZkA4QeZL05vq-TAdM9Kub5GGWgY'
const CHANNEL_ID = '@KSPmivtzei'

const bot = new Telegraf(BOT_TOKEN)
const prisma = new PrismaClient()

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

async function testPost() {
  console.log('🔍 Finding a product to post...\n')

  // Get a random product with content
  const product = await prisma.product.findFirst({
    where: {
      content: { some: { lang: 'he' } },
      imageUrl: { not: null }
    },
    include: {
      content: { where: { lang: 'he' } }
    },
    orderBy: { priceCurrent: 'asc' } // Cheapest first
  })

  if (!product) {
    console.log('❌ No products found!')
    process.exit(1)
  }

  const title = product.content[0]?.title || product.sku
  const price = product.priceCurrent
  const affiliateLink = `https://ksp.co.il/web/item/${product.sku}?appkey=14887`

  console.log(`📦 Product: ${title}`)
  console.log(`💰 Price: ₪${price}`)
  console.log(`🔗 Link: ${affiliateLink}`)
  console.log(`🖼️ Image: ${product.imageUrl}`)
  console.log('')

  const message = `🛒 *מוצר מומלץ\\!*

📦 ${escapeMarkdown(title)}

💰 *₪${price}*

🔗 [לצפייה ב\\-KSP](${affiliateLink})`

  const keyboard = {
    inline_keyboard: [[
      { text: '🛒 לרכישה ב-KSP', url: affiliateLink }
    ]]
  }

  try {
    console.log('📤 Sending to Telegram...')
    
    if (product.imageUrl) {
      await bot.telegram.sendPhoto(CHANNEL_ID, product.imageUrl, {
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

    console.log('✅ Posted successfully!')
  } catch (error) {
    console.error('❌ Failed to post:', error.message)
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2))
    }
  }

  await prisma.$disconnect()
  process.exit(0)
}

testPost()
