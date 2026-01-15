const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  console.log('Clearing all data...')
  
  // Delete in correct order due to foreign keys
  await p.priceAlert.deleteMany({})
  console.log('- Deleted price alerts')
  
  await p.revenueTracking.deleteMany({})
  console.log('- Deleted revenue tracking')
  
  await p.content.deleteMany({})
  console.log('- Deleted content')
  
  await p.product.deleteMany({})
  console.log('- Deleted products')
  
  console.log('\n✅ Database cleared! Ready for fresh scrape.')
}

main().finally(() => p.$disconnect())
