const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  console.log('=== Products in Database ===')
  const products = await prisma.product.findMany({
    take: 5,
    include: {
      content: { where: { lang: 'he' } }
    }
  })
  
  console.log(`Found ${products.length} products:`)
  products.forEach(p => {
    console.log(`- ID: ${p.id}, SKU: ${p.sku}, Title: ${p.content[0]?.title || 'No title'}`)
    console.log(`  KSP URL: ${p.kspUrl}`)
    console.log(`  Redirect: http://localhost:3001/go/${p.id}?channel=site&lang=he`)
  })
  
  await prisma.$disconnect()
}

main()
