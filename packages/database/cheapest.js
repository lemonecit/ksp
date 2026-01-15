const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const products = await p.product.findMany({
    orderBy: { priceCurrent: 'asc' },
    take: 10,
    include: { content: { where: { lang: 'he' } } }
  })
  
  console.log('=== BILLIGASTE PRODUKTER ===\n')
  
  for (const prod of products) {
    const title = prod.content[0]?.title || 'No title'
    console.log(`\u20aa${prod.priceCurrent} - ${title}`)
    console.log(`Affiliate: https://ksp.co.il/web/item/${prod.sku}?appkey=14887`)
    console.log('')
  }
}

main().finally(() => p.$disconnect())
