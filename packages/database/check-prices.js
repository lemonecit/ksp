const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const products = await p.product.findMany({
    take: 10,
    orderBy: { priceCurrent: 'desc' },
    include: { content: { where: { lang: 'he' } } }
  })
  
  console.log('\n--- TOP 10 PRISER ---')
  for (const prod of products) {
    const title = prod.content[0]?.title || prod.sku
    console.log(`₪${prod.priceCurrent.toLocaleString()} - ${title.substring(0, 50)}`)
  }
  
  // Also check some alerts
  const alerts = await p.priceAlert.findMany({
    take: 5,
    include: { product: { include: { content: true } } }
  })
  
  console.log('\n--- ALERTS ---')
  for (const a of alerts) {
    const title = a.product.content[0]?.title || a.product.sku
    console.log(`${a.type}: ₪${a.oldPrice} -> ₪${a.newPrice} (${a.percentChange}%) - ${title.substring(0, 40)}`)
  }
}

main().finally(() => p.$disconnect())
