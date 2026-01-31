const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  console.log('=== Price Alerts in Database ===')
  const alerts = await prisma.priceAlert.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: { content: { where: { lang: 'he' } } }
      }
    }
  })
  
  console.log(`Found ${alerts.length} alerts:`)
  alerts.forEach(a => {
    const title = a.product?.content[0]?.title || a.product?.sku || 'Unknown'
    console.log(`- [${a.status}] ${a.type}: ${title.substring(0, 50)}`)
    if (a.oldPrice) {
      console.log(`  Price: ${a.oldPrice}₪ → ${a.newPrice}₪ (${a.percentChange}%)`)
    }
  })
  
  // Count by status
  const pendingCount = await prisma.priceAlert.count({ where: { status: 'pending' } })
  const sentCount = await prisma.priceAlert.count({ where: { status: 'sent' } })
  
  console.log(`\nStats: ${pendingCount} pending, ${sentCount} sent`)
  
  await prisma.$disconnect()
}

main()
