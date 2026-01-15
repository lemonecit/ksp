import OpenAI from 'openai'
import { prisma } from '@ksp/database'
import PQueue from 'p-queue'

/**
 * TRANSLATOR (Worker B)
 * 
 * This worker monitors the products table for items
 * that don't have English content yet.
 * It uses OpenAI to translate Hebrew titles/descriptions
 * to professional English.
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Rate limit: 10 requests per minute to be safe
const queue = new PQueue({ concurrency: 2, interval: 6000, intervalCap: 10 })

async function translateToEnglish(hebrewText: string, category: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator specializing in e-commerce product descriptions.
Translate Hebrew technical product descriptions to English.

RULES:
- Maintain ALL technical specifications exactly (RAM, GPU, CPU, Hz, inches, etc.)
- Use professional sales tone
- Keep brand names unchanged
- Be concise but informative
- Format for web readability

Category context: ${category}`
      },
      {
        role: 'user',
        content: `Translate this product title/description from Hebrew to English:\n\n${hebrewText}`
      }
    ],
    max_tokens: 500
  })
  
  return response.choices[0].message.content || hebrewText
}

function createEnglishSlug(hebrewSlug: string, englishTitle: string): string {
  // Create SEO-friendly English slug
  const baseSlug = englishTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
  
  // Extract SKU from Hebrew slug if present
  const skuMatch = hebrewSlug.match(/(\d{5,})/)
  const sku = skuMatch ? skuMatch[1] : ''
  
  return `en-${sku}-${baseSlug}`
}

async function translateProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      content: true
    }
  })
  
  if (!product) return
  
  const hebrewContent = product.content.find(c => c.lang === 'he')
  const hasEnglish = product.content.some(c => c.lang === 'en')
  
  if (!hebrewContent || hasEnglish) {
    return // Skip if no Hebrew or already has English
  }
  
  console.log(`🔄 Translating: ${hebrewContent.title.substring(0, 50)}...`)
  
  try {
    // Translate title
    const englishTitle = await translateToEnglish(hebrewContent.title, product.category)
    
    // Translate description (if different from title)
    let englishDescription = englishTitle
    if (hebrewContent.description !== hebrewContent.title) {
      englishDescription = await translateToEnglish(hebrewContent.description, product.category)
    }
    
    // Create English content
    await prisma.content.create({
      data: {
        productId,
        lang: 'en',
        title: englishTitle,
        description: englishDescription,
        slug: createEnglishSlug(hebrewContent.slug, englishTitle)
      }
    })
    
    console.log(`✅ Translated: ${englishTitle.substring(0, 50)}...`)
  } catch (error) {
    console.error(`❌ Failed to translate ${productId}:`, error)
  }
}

export async function runTranslator() {
  console.log('🌍 Starting Translator Worker...')
  
  // Find all products without English content
  const productsNeedingTranslation = await prisma.product.findMany({
    where: {
      content: {
        none: {
          lang: 'en'
        }
      }
    },
    select: { id: true }
  })
  
  console.log(`📝 Found ${productsNeedingTranslation.length} products needing translation`)
  
  // Queue all translations
  for (const product of productsNeedingTranslation) {
    queue.add(() => translateProduct(product.id))
  }
  
  // Wait for all to complete
  await queue.onIdle()
  
  console.log('✨ Translation complete!')
}

// Run if called directly
if (require.main === module) {
  runTranslator().catch(console.error)
}
