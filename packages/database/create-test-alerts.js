const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get 3 products with content
  const products = await prisma.product.findMany({ 
    take: 3, 
    orderBy: { priceCurrent: 'desc' },
    include: { content: true }
  })
  
  console.log(`Found ${products.length} products`)
  
  for (const p of products) {
    const title = p.content?.[0]?.title || p.sku
    const alert = await prisma.priceAlert.create({ 
      data: { 
        productId: p.id, 
        type: 'price_drop', 
        oldPrice: Math.round(p.priceCurrent * 1.2), 
        newPrice: p.priceCurrent, 
        percentChange: -16.67, 
        status: 'pending' 
      } 
    })
    console.log('Created alert for:', title.substring(0, 50), '- Old:', alert.oldPrice, '-> New:', alert.newPrice)
  }
  
  const count = await prisma.priceAlert.count()
  console.log(`\nTotal alerts: ${count}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect() })
