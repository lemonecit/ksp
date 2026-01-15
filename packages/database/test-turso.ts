// Test Turso connection
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  console.log('🔌 Testing Turso connection...')
  
  // Test query
  const result = await client.execute('SELECT COUNT(*) as count FROM Product')
  console.log('✅ Connected! Products in database:', result.rows[0].count)
  
  // Test TelegramSettings
  const settings = await client.execute('SELECT * FROM TelegramSettings')
  console.log('📱 Telegram Settings:', settings.rows[0])
  
  console.log('\n🎉 Turso is working!')
}

main().catch(console.error)
