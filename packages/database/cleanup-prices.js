const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Find products with unrealistic prices (over 50,000 ILS)
  const badProducts = await p.product.findMany({
    where: { priceCurrent: { gt: 50000 } },
    include: { content: true }
  })
  
  console.log(`Found ${badProducts.length} products with price > 50,000 ILS:`)
  for (const prod of badProducts) {
    const title = prod.content[0]?.title || prod.sku
    console.log(`- ₪${prod.priceCurrent.toLocaleString()} - ${title.substring(0, 60)}`)
  }
  
  // Delete products with "להרכיב" (configure) in title - these have wrong prices
  const configProducts = await p.product.findMany({
    where: {
      content: {
        some: {
          title: { contains: 'להרכיב' }
        }
      }
    }
  })
  
  console.log(`\nFound ${configProducts.length} "configure" products to delete`)
  
  // Delete related records first
  for (const prod of configProducts) {
    await p.priceAlert.deleteMany({ where: { productId: prod.id } })
    await p.content.deleteMany({ where: { productId: prod.id } })
    await p.product.delete({ where: { id: prod.id } })
    console.log(`Deleted: ${prod.sku}`)
  }
  
  // Also delete any remaining products with price > 50,000
  const stillBad = await p.product.findMany({
    where: { priceCurrent: { gt: 50000 } }
  })
  
  for (const prod of stillBad) {
    await p.priceAlert.deleteMany({ where: { productId: prod.id } })
    await p.content.deleteMany({ where: { productId: prod.id } })
    await p.product.delete({ where: { id: prod.id } })
    console.log(`Deleted high-price: ${prod.sku}`)
  }
  
  const remaining = await p.product.count()
  console.log(`\nRemaining products: ${remaining}`)
}

main().finally(() => p.$disconnect())
