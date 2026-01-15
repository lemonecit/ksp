import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductJsonLd from '@/components/ProductJsonLd'
import PriceHistoryChart from '@/components/PriceHistoryChart'

interface Props {
  params: { locale: string; slug: string }
}

// Skip static generation - use dynamic rendering only
export const dynamic = 'force-dynamic'

// Dynamic metadata for SEO (fetch from API route)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/product?locale=${params.locale}&slug=${params.slug}`)
  if (!res.ok) return { title: 'Product Not Found' }
  const content = await res.json()
  return {
    title: `${content.title} | SmartBuy`,
    description: content.description.substring(0, 160),
    alternates: {
      languages: {
        'he': `/he/${params.slug}`,
        'en': `/en/${params.slug}`,
      }
    }
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = params
  const isHebrew = locale === 'he'
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/product?locale=${locale}&slug=${slug}`)
  if (!res.ok) notFound()
  const content = await res.json()
  const { product } = content
  return (
    <>
      {/* JSON-LD Schema for Google Rich Results */}
      <ProductJsonLd
        name={content.title}
        description={content.description}
        price={product.priceCurrent.toString()}
        currency="ILS"
        availability={product.inStock ? 'InStock' : 'OutOfStock'}
        url={`https://smartbuy.co.il/${locale}/${slug}`}
        image={product.imageUrl || ''}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-lg p-8">
            {product.imageUrl && (
              <img 
                src={product.imageUrl} 
                alt={content.title}
                className="w-full max-h-96 object-contain"
              />
            )}
          </div>
          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold text-blue-600">
                ₪{product.priceCurrent.toString()}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                product.inStock 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.inStock 
                  ? (isHebrew ? 'במלאי' : 'In Stock')
                  : (isHebrew ? 'אזל מהמלאי' : 'Out of Stock')
                }
              </span>
            </div>
            {/* Affiliate CTA Button */}
            <a 
              href={`/go/${product.id}?channel=site&lang=${locale}`}
              className="btn-affiliate block text-center text-xl py-4 mb-8"
            >
              {isHebrew ? '🛒 קנה עכשיו ב-KSP' : '🛒 Buy Now at KSP'}
            </a>
            {/* Description */}
            <div className="prose max-w-none">
              <h2>{isHebrew ? 'תיאור' : 'Description'}</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {content.description}
              </p>
            </div>
          </div>
        </div>
        {/* Price History Chart */}
        <section className="mt-12 bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            {isHebrew ? 'היסטוריית מחירים' : 'Price History'}
          </h2>
          <PriceHistoryChart data={product.priceHistory as any[]} />
        </section>
      </main>
    </>
  )
}
