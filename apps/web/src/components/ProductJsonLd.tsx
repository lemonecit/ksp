interface Props {
  name: string
  description: string
  price: string
  currency: string
  availability: 'InStock' | 'OutOfStock'
  url: string
  image: string
}

export default function ProductJsonLd({
  name,
  description,
  price,
  currency,
  availability,
  url,
  image
}: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url
    }
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
