-- CreateTable
CREATE TABLE "TelegramPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "alertId" TEXT,
    "title" TEXT NOT NULL,
    "oldPrice" REAL,
    "newPrice" REAL NOT NULL,
    "percentOff" REAL,
    "imageUrl" TEXT,
    "affiliateLink" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "messageId" TEXT,
    "error" TEXT,
    "scheduledFor" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TelegramSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "botToken" TEXT NOT NULL DEFAULT '',
    "channelId" TEXT NOT NULL DEFAULT '',
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleTimes" TEXT NOT NULL DEFAULT '["10:00", "20:00"]',
    "minDiscountPercent" REAL NOT NULL DEFAULT 40,
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 10,
    "postsToday" INTEGER NOT NULL DEFAULT 0,
    "lastPostAt" DATETIME,
    "lastResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "oldPrice" REAL,
    "newPrice" REAL,
    "percentChange" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PriceAlert" ("createdAt", "id", "newPrice", "oldPrice", "percentChange", "productId", "sentAt", "status", "type") SELECT "createdAt", "id", "newPrice", "oldPrice", "percentChange", "productId", "sentAt", "status", "type" FROM "PriceAlert";
DROP TABLE "PriceAlert";
ALTER TABLE "new_PriceAlert" RENAME TO "PriceAlert";
CREATE INDEX "PriceAlert_type_idx" ON "PriceAlert"("type");
CREATE INDEX "PriceAlert_status_idx" ON "PriceAlert"("status");
CREATE INDEX "PriceAlert_createdAt_idx" ON "PriceAlert"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TelegramPost_status_idx" ON "TelegramPost"("status");

-- CreateIndex
CREATE INDEX "TelegramPost_createdAt_idx" ON "TelegramPost"("createdAt");
