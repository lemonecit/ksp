# KSP Affiliate Revenue System

Ett komplett affiliate-system för att generera intäkter från KSP.co.il via hemsida och sociala medier.

## 🏗️ Projektstruktur

```
ksp/
├── apps/
│   ├── web/          # Next.js frontend (SEO-optimerad, tvåspråkig)
│   ├── api/          # Fastify backend (affiliate tracking, revenue API)
│   ├── admin/        # Refine.dev admin dashboard
│   └── scraper/      # KSP scraper + AI translator
├── packages/
│   └── database/     # Prisma schema och klient
└── specifikation.md  # Original spec
```

## 🚀 Kom igång

### 1. Installera dependencies
```bash
npm install
```

### 2. Konfigurera miljövariabler
```bash
cp .env.example .env
# Redigera .env med dina värden:
# - DATABASE_URL (PostgreSQL)
# - OPENAI_API_KEY
# - KSP_AFFILIATE_ID
```

### 3. Sätt upp databasen
```bash
npm run db:generate
npm run db:migrate
```

### 4. Starta allt
```bash
npm run dev
```

Detta startar:
- **Web** på http://localhost:3000 (kundsajt)
- **API** på http://localhost:3001 (backend)
- **Admin** på http://localhost:3002 (dashboard)

## 📦 Moduler

### 🌐 Web (Next.js)
- SEO-optimerad med SSR
- Tvåspråkig (hebreiska + engelska) med hreflang
- JSON-LD Schema för Google Rich Results
- Prishistorik-grafer

### 🔗 Affiliate Tracking
All trafik går via `/go/:productId?channel=X&lang=Y`

Flöde:
1. Användaren klickar på affiliate-länk
2. Backend loggar klicket i `revenue_tracking`
3. Redirect till KSP med `?uin=AFFILIATE_ID_trackingId`
4. KSP-rapport matchas senare för att bekräfta försäljning

### 🤖 Scraper & Translator
```bash
cd apps/scraper
npm run scrape     # Hämta produkter från KSP
npm run translate  # Översätt till engelska med GPT-4
```

### 📊 Admin Dashboard
- Total Revenue / EPC / Conversion Rate
- Revenue per Platform (Telegram, Site, WhatsApp)
- Revenue per Language (Hebrew vs English)
- KSP-rapport import med drag & drop

## 🔑 Viktiga filer

| Fil | Beskrivning |
|-----|-------------|
| `packages/database/prisma/schema.prisma` | Databasschema |
| `apps/api/src/routes/redirect.ts` | Affiliate tracking-logik |
| `apps/scraper/src/scraper.ts` | KSP produkt-scraper |
| `apps/scraper/src/translator.ts` | AI-översättning |
| `apps/admin/src/pages/dashboard/index.tsx` | Revenue dashboard |

## 📈 EPC Formel

$$EPC = \frac{\text{Total Commission}}{\text{Total Clicks}}$$

## 🔮 Nästa steg

1. [ ] Lägg till Telegram bot för automatiska deals
2. [ ] Instagram integration
3. [ ] A/B-testning av CTA-knappar
4. [ ] Email-prenumeration för prisalarm
5. [ ] Kategorisida med filter
