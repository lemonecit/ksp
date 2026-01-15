// This page should not be reached because middleware redirects to /[locale]
// It's here as a fallback

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/he')
}
