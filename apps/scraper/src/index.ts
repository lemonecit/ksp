import { runScraper } from './scraper'
import { runTranslator } from './translator'

/**
 * MAIN WORKER ORCHESTRATOR
 * 
 * This runs the full pipeline:
 * 1. Scrape products from KSP
 * 2. Translate new products to English
 * 
 * Run with: npm run dev (in apps/scraper)
 */

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  KSP AFFILIATE DATA PIPELINE')
  console.log('═══════════════════════════════════════')
  
  // Step 1: Scrape products
  console.log('\n📦 STEP 1: Scraping Products')
  console.log('─────────────────────────────')
  await runScraper()
  
  // Step 2: Translate to English
  console.log('\n🌍 STEP 2: Translating Content')
  console.log('─────────────────────────────')
  await runTranslator()
  
  console.log('\n═══════════════════════════════════════')
  console.log('  ✨ PIPELINE COMPLETE!')
  console.log('═══════════════════════════════════════')
}

main().catch(console.error)
