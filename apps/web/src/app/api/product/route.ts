import { NextRequest } from 'next/server'
import { prisma } from '@ksp/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const locale = searchParams.get('locale')
  const slug = searchParams.get('slug')
  if (!locale || !slug) {
    return new Response(JSON.stringify({ error: 'Missing locale or slug' }), { status: 400 })
  }
  const content = await prisma.content.findFirst({
    where: { slug, lang: locale },
    include: { product: true }
  })
  if (!content) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
  return new Response(JSON.stringify(content), { status: 200 })
}
