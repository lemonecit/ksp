const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const products = await p.product.findMany({
    take: 5,
    select: { sku: true, kspUrl: true }
  })
  
  console.log('=== AFFILIATE LINKS ===\n')
  console.log('Din kod: 14887\n')
  
  for (const prod of products) {
    console.log(`Original:  ${prod.kspUrl}`)
    console.log(`Affiliate: https://ksp.co.il/web/item/${prod.sku}?appkey=14887`)
    console.log('')
  }
}

main().finally(() => p.$disconnect())
