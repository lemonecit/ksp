import { chromium, Page } from 'playwright'
import { prisma } from '@ksp/database'
import { Telegraf } from 'telegraf'

/**
 * KSP SCRAPER (Worker A)
 * 
 * This worker scrapes product data from ksp.co.il
 * It extracts: price, stock status, images, Hebrew title
 * and saves to the products table.
 * 
 * Automatically posts significant price drops to Telegram!
 */

const KSP_BASE_URL = 'https://ksp.co.il'

// Telegram config
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8126807418:AAEPb8GWZkA4QeZL05vq-TAdM9Kub5GGWgY'
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@KSPmivtzei'
const MIN_DISCOUNT_PERCENT = 5 // Minimum discount to post to Telegram
const KSP_AFFILIATE_ID = '14887'

const bot = new Telegraf(BOT_TOKEN)

// Escape special characters for Telegram MarkdownV2
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

// Post price drop to Telegram
async function postToTelegram(
  title: string,
  oldPrice: number,
  newPrice: number,
  sku: string,
  imageUrl?: string,
  percentOff?: number
) {
  const savings = oldPrice - newPrice
  const discount = percentOff || Math.round((savings / oldPrice) * 100)
  const affiliateLink = `https://ksp.co.il/web/item/${sku}?appkey=${KSP_AFFILIATE_ID}`

  const message = `🔥 *ירידת מחיר\\!* 🔥

📦 ${escapeMarkdown(title)}

~~₪${oldPrice}~~ → *₪${newPrice}*
💥 חיסכון של ${discount}% \\(₪${Math.round(savings)}\\)\\!

⏰ *מלאי מוגבל\\!*`

  const keyboard = {
    inline_keyboard: [[
      { text: '🛒 לרכישה ב-KSP', url: affiliateLink }
    ]]
  }

  try {
    if (imageUrl) {
      await bot.telegram.sendPhoto(CHANNEL_ID, imageUrl, {
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
    console.log(`   📢 POSTED TO TELEGRAM: ${title.substring(0, 40)}...`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Telegram error: ${error.message}`)
    return false
  }
}

// Categories to scrape - KSP uses "world" for main sections
const CATEGORIES = [
  // 📱 Mobile & Tablets 
  { url: '/web/cat/573..', name: 'iphone' },                      // iPhone
  { url: '/web/cat/574..', name: 'ipad' },                        // iPad
  { url: '/web/cat/89080..', name: 'xiaomi-phones' },             // Xiaomi phones
  
  // 💻 Computers
  { url: '/web/cat/159..', name: 'laptops' },                     // Laptops
  { url: '/web/cat/271..', name: 'gaming-laptops' },              // Gaming laptops
  { url: '/web/cat/130..', name: 'monitors' },                    // Monitors
  
  // 📺 TV & Video
  { url: '/web/cat/3169..', name: 'smart-tv' },                   // Smart TV
  { url: '/web/cat/6346..', name: 'soundbars' },                  // Soundbars
  
  // 🎧 Audio
  { url: '/web/cat/347..', name: 'headphones' },                  // Headphones
  { url: '/web/cat/263..', name: 'bluetooth-speakers' },          // Bluetooth speakers
  { url: '/web/cat/617..', name: 'earbuds' },                     // Earbuds
  
  // 🎮 Gaming
  { url: '/web/cat/2108..', name: 'playstation' },                // PlayStation
  { url: '/web/cat/36..', name: 'xbox' },                         // Xbox
  { url: '/web/cat/2062..', name: 'nintendo' },                   // Nintendo
  
  // 📷 Cameras
  { url: '/web/cat/1012..', name: 'action-cameras' },             // Action cameras
  
  // 🏠 Smart Home
  { url: '/web/cat/1657..', name: 'robot-vacuums' },              // Robot vacuums
  
  // ☕ Kitchen
  { url: '/web/cat/289..', name: 'coffee-machines' },             // Coffee machines
  
  // ⌨️ Peripherals
  { url: '/web/cat/349..', name: 'keyboards' },                   // Keyboards
  { url: '/web/cat/348..', name: 'mice' },                        // Mice
]

interface ScrapedProduct {
  sku: string
  title: string
  price: number
  imageUrl: string
  inStock: boolean
  kspUrl: string
  category: string
}

async function scrapeProductList(page: Page, categoryUrl: string, categoryName: string): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = []
  
  try {
    await page.goto(`${KSP_BASE_URL}${categoryUrl}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    
    // Wait for products to load - KSP uses React with dynamically generated class names
    await page.waitForSelector('[class*="product-"]', { timeout: 30000 }).catch(() => null)
    await page.waitForTimeout(3000) // Wait for lazy loading
  
    // Extract product data using KSP's actual HTML structure
    const items = await page.$$eval('[class*="product-0-3-"]', (elements) => {
      return elements.map(el => {
        // Product link with item ID
        const linkEl = el.querySelector('a[href*="/item/"]')
        const href = linkEl?.getAttribute('href') || ''
        const skuMatch = href.match(/\/item\/(\d+)/)
        
        // Product title
        const titleEl = el.querySelector('a[class*="productTitle"]')
        
        // Current price (class contains "currentPrice")
        const priceEl = el.querySelector('[class*="currentPrice-"]')
        const priceText = priceEl?.textContent?.replace(/[^\d.,]/g, '') || '0'
        
        // Old price if on sale
        const oldPriceEl = el.querySelector('[class*="oldPrice-"]')
        
        // Image from lazy load wrapper
        const imgEl = el.querySelector('[class*="lazyLoadWrapper"] img, [class*="imageWrapper"] img')
        let imgSrc = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || ''
        if (imgSrc && !imgSrc.startsWith('http')) {
          imgSrc = `https://ksp.co.il${imgSrc}`
        }
        
        // SKU from sku wrapper
        const skuEl = el.querySelector('[class*="skuWrapper"]')
        const skuText = skuEl?.textContent?.match(/\d+/)?.[0] || ''
        
        return {
          sku: skuMatch ? skuMatch[1] : skuText,
          title: titleEl?.textContent?.trim() || '',
          price: parseFloat(priceText.replace(',', '')) || 0,
          oldPrice: oldPriceEl ? parseFloat(oldPriceEl.textContent?.replace(/[^\d.,]/g, '').replace(',', '') || '0') : null,
          imageUrl: imgSrc,
          kspUrl: href.startsWith('http') ? href : `https://ksp.co.il${href}`,
          inStock: !el.textContent?.includes('אזל') // "Out of stock" in Hebrew
        }
      }).filter(p => {
        // Filter out invalid products
        if (!p.sku || p.price <= 0) return false
        // Skip "configure" products with potentially wrong prices
        if (p.title.includes('להרכיב')) return false
        // Skip unrealistic prices (over 35,000 ILS for most electronics)
        if (p.price > 35000) return false
        return true
      })
    })
    
    for (const item of items) {
      // Use smart category detection instead of URL-based category
      const smartCategory = detectCategory(item.title)
      products.push({ ...item, category: smartCategory })
    }
  } catch (error) {
    console.log(`  ⚠️ Error scraping ${categoryName}: ${error}`)
  }
  
  return products
}

async function saveProduct(product: ScrapedProduct) {
  const existing = await prisma.product.findUnique({
    where: { sku: product.sku }
  })
  
  if (existing) {
    // Update existing - add to price history if price changed
    let priceHistory: any[] = []
    try {
      priceHistory = JSON.parse(existing.priceHistory || '[]')
    } catch (e) {
      priceHistory = []
    }
    const lastPrice = priceHistory[priceHistory.length - 1]?.price || existing.priceCurrent
    
    // Check for price change
    if (lastPrice !== product.price) {
      priceHistory.push({ price: product.price, date: new Date().toISOString() })
      
      // Calculate percent change
      const percentChange = ((product.price - lastPrice) / lastPrice) * 100
      
      // Create price alert if significant change (> 1%)
      if (Math.abs(percentChange) > 1) {
        const alertType = percentChange < 0 ? 'price_drop' : 'price_increase'
        
        await prisma.priceAlert.create({
          data: {
            productId: existing.id,
            type: alertType,
            oldPrice: lastPrice,
            newPrice: product.price,
            percentChange: Math.round(percentChange * 10) / 10, // Round to 1 decimal
            status: 'pending'
          }
        })
        
        const emoji = percentChange < 0 ? '🔥 PRICE DROP' : '📈 Price Up'
        console.log(`   ${emoji}: ${product.sku} ${lastPrice}₪ → ${product.price}₪ (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`)
        
        // Auto-post significant price drops to Telegram
        if (percentChange < 0 && Math.abs(percentChange) >= MIN_DISCOUNT_PERCENT) {
          await postToTelegram(
            product.title,
            lastPrice,
            product.price,
            product.sku,
            product.imageUrl,
            Math.abs(Math.round(percentChange))
          )
        }
      }
    }
    
    // Check for back in stock
    if (!existing.inStock && product.inStock) {
      await prisma.priceAlert.create({
        data: {
          productId: existing.id,
          type: 'back_in_stock',
          newPrice: product.price,
          status: 'pending'
        }
      })
      console.log(`   🎉 BACK IN STOCK: ${product.sku}`)
    }
    
    await prisma.product.update({
      where: { sku: product.sku },
      data: {
        priceCurrent: product.price,
        priceHistory: JSON.stringify(priceHistory),
        inStock: product.inStock,
        imageUrl: product.imageUrl
      }
    })
    
    console.log(`📝 Updated: ${product.sku} - ${product.title}`)
  } else {
    // Create new product
    const priceHistoryJson = JSON.stringify([{ price: product.price, date: new Date().toISOString() }])
    
    const newProduct = await prisma.product.create({
      data: {
        sku: product.sku,
        priceCurrent: product.price,
        priceHistory: priceHistoryJson,
        category: product.category,
        imageUrl: product.imageUrl,
        inStock: product.inStock,
        kspUrl: product.kspUrl
      }
    })
    
    // Create Hebrew content
    await prisma.content.create({
      data: {
        productId: newProduct.id,
        lang: 'he',
        title: product.title,
        description: product.title, // Will be enriched later
        slug: `he-${product.sku}-${slugify(product.title)}`
      }
    })
    
    console.log(`✅ Created: ${product.sku} - ${product.title}`)
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

/**
 * Detect the actual category based on product title keywords
 * This is more reliable than KSP's category URLs which can be inconsistent
 */
function detectCategory(title: string): string {
  const titleLower = title.toLowerCase()
  
  // iPhone
  if (titleLower.includes('iphone') || title.includes('אייפון')) {
    return 'iphone'
  }
  
  // iPad
  if (titleLower.includes('ipad') || title.includes('אייפד')) {
    return 'ipad'
  }
  
  // MacBook
  if (titleLower.includes('macbook')) {
    return 'macbook'
  }
  
  // Android phones
  if (titleLower.includes('samsung galaxy') && (titleLower.includes('phone') || title.includes('טלפון') || titleLower.includes('sm-'))) {
    return 'android-phones'
  }
  if (titleLower.includes('xiaomi') || titleLower.includes('poco') || titleLower.includes('redmi')) {
    return 'android-phones'
  }
  if (title.includes('טלפון סלולרי')) {
    return 'phones'
  }
  
  // TV
  if (title.includes('טלוויזיה') || (titleLower.includes('oled') && titleLower.includes('tv'))) {
    return 'tv'
  }
  if (titleLower.includes('tv') && (titleLower.includes('samsung') || titleLower.includes('lg') || titleLower.includes('hisense'))) {
    return 'tv'
  }
  
  // Monitors
  if (title.includes('מסך מחשב') || title.includes('מסך גיימינג')) {
    return 'monitors'
  }
  if (titleLower.includes('monitor') || (titleLower.includes("''") && titleLower.includes('hz'))) {
    return 'monitors'
  }
  
  // Laptops
  if (title.includes('מחשב נייד') || titleLower.includes('laptop')) {
    return 'laptops'
  }
  if (titleLower.includes('ideapad') || titleLower.includes('legion') || titleLower.includes('loq') || titleLower.includes('vivobook')) {
    return 'laptops'
  }
  
  // Tablets
  if (title.includes('טאבלט') || titleLower.includes('tablet') || titleLower.includes('tab ')) {
    return 'tablets'
  }
  
  // PC Cases
  if (title.includes('מארז') && (title.includes('מחשב') || titleLower.includes('tower') || titleLower.includes('atx'))) {
    return 'pc-cases'
  }
  
  // External HDD cases
  if (title.includes('מארז') && (title.includes('כונן') || titleLower.includes('hdd') || titleLower.includes('ssd') || titleLower.includes('sata'))) {
    return 'hdd-enclosures'
  }
  
  // Gaming consoles
  if (titleLower.includes('playstation') || titleLower.includes('ps5') || titleLower.includes('xbox') || titleLower.includes('nintendo')) {
    return 'gaming'
  }
  
  // Cameras
  if (titleLower.includes('gopro') || title.includes('מצלמ')) {
    return 'cameras'
  }
  
  // Kitchen appliances
  if (title.includes('שווארמה') || title.includes('צלייה') || title.includes('קפה') || title.includes('טוסטר')) {
    return 'kitchen'
  }
  
  // CPU
  if (title.includes('מעבד') || titleLower.includes('intel core') || titleLower.includes('amd ryzen')) {
    return 'cpu'
  }
  
  // Desktop
  if (title.includes('מחשב נייח') || titleLower.includes('all-in-one') || titleLower.includes('aio')) {
    return 'desktops'
  }
  
  // Headphones
  if (title.includes('אוזניות') || titleLower.includes('headphone') || titleLower.includes('earbuds') || titleLower.includes('airpods')) {
    return 'headphones'
  }
  
  // Robot vacuum
  if (title.includes('שואב רובוט') || titleLower.includes('roborock') || titleLower.includes('roomba')) {
    return 'robot-vacuums'
  }
  
  return 'other'
}

export async function runScraper() {
  console.log('🚀 Starting KSP Scraper...')
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--lang=he-IL']
  })
  
  const context = await browser.newContext({
    locale: 'he-IL',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  
  const page = await context.newPage()
  
  try {
    for (const category of CATEGORIES) {
      console.log(`\n📁 Scraping category: ${category.name}`)
      
      const products = await scrapeProductList(page, category.url, category.name)
      console.log(`   Found ${products.length} products`)
      
      for (const product of products) {
        await saveProduct(product)
      }
      
      // Be nice to KSP - add delay between categories
      await page.waitForTimeout(2000)
    }
    
    console.log('\n✨ Scraping complete!')
  } finally {
    await browser.close()
  }
}

// Run if called directly
if (require.main === module) {
  runScraper().catch(console.error)
}
