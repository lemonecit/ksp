import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'he' }]
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Optional: Add locale validation
  if (locale !== 'en' && locale !== 'he') {
    notFound()
  }

  return (
    <div lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      {children}
    </div>
  )
}
