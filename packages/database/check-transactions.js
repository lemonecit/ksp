const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  console.log('=== Revenue Tracking Records ===')
  const transactions = await prisma.revenueTracking.findMany({
    include: {
      product: true
    },
    orderBy: { clickedAt: 'desc' }
  })
  
  console.log(`Found ${transactions.length} transactions:`)
  console.log(JSON.stringify(transactions, null, 2))
  
  await prisma.$disconnect()
}

main()
