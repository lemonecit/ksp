// Push schema to Turso database
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const schema = `
-- Products table
CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    priceCurrent REAL NOT NULL,
    priceHistory TEXT DEFAULT '[]',
    category TEXT NOT NULL,
    imageUrl TEXT,
    inStock INTEGER DEFAULT 1,
    kspUrl TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content table (translations)
CREATE TABLE IF NOT EXISTS Content (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    lang TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL,
    FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE,
    UNIQUE(productId, lang)
);

-- Revenue Tracking
CREATE TABLE IF NOT EXISTS RevenueTracking (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    platform TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    commission REAL,
    clickedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    confirmedAt TEXT,
    FOREIGN KEY (productId) REFERENCES Product(id)
);

-- Report Imports
CREATE TABLE IF NOT EXISTS ReportImport (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    totalRows INTEGER NOT NULL,
    matchedRows INTEGER NOT NULL,
    totalRevenue REAL NOT NULL,
    importedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Price Alerts
CREATE TABLE IF NOT EXISTS PriceAlert (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    targetPrice REAL NOT NULL,
    previousPrice REAL NOT NULL,
    currentPrice REAL NOT NULL,
    discountPercent REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    notifiedAt TEXT,
    FOREIGN KEY (productId) REFERENCES Product(id)
);

-- Telegram Posts
CREATE TABLE IF NOT EXISTS TelegramPost (
    id TEXT PRIMARY KEY,
    alertId TEXT NOT NULL,
    productId TEXT NOT NULL,
    messageId TEXT,
    postedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertId) REFERENCES PriceAlert(id),
    FOREIGN KEY (productId) REFERENCES Product(id)
);

-- Telegram Settings
CREATE TABLE IF NOT EXISTS TelegramSettings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    isActive INTEGER DEFAULT 1,
    scheduleTimes TEXT DEFAULT '["10:00","20:00"]',
    minDiscountPercent REAL DEFAULT 40,
    maxPostsPerDay INTEGER DEFAULT 10,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_sku ON Product(sku);
CREATE INDEX IF NOT EXISTS idx_product_category ON Product(category);
CREATE INDEX IF NOT EXISTS idx_content_slug ON Content(slug);
CREATE INDEX IF NOT EXISTS idx_content_lang ON Content(lang);
CREATE INDEX IF NOT EXISTS idx_revenue_status ON RevenueTracking(status);
CREATE INDEX IF NOT EXISTS idx_alert_status ON PriceAlert(status);

-- Insert default telegram settings
INSERT OR IGNORE INTO TelegramSettings (id, isActive, scheduleTimes, minDiscountPercent, maxPostsPerDay)
VALUES ('default', 1, '["10:00","20:00"]', 40, 10);
`

async function main() {
  console.log('🚀 Pushing schema to Turso...')
  console.log('   URL:', process.env.TURSO_DATABASE_URL)
  
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  for (const statement of statements) {
    try {
      await client.execute(statement)
      console.log('✅', statement.substring(0, 50) + '...')
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('❌ Error:', error.message)
        console.error('   Statement:', statement.substring(0, 100))
      }
    }
  }
  
  // Verify tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
  console.log('\n📋 Tables in Turso:')
  tables.rows.forEach(row => console.log('   -', row.name))
  
  console.log('\n✅ Schema pushed successfully!')
}

main().catch(console.error)
