/**
 * KSP AFFILIATE LINK UTILITIES
 * 
 * Centralized affiliate link generation for all platforms
 */

// Your KSP affiliate/partner ID
export const KSP_AFFILIATE_ID = process.env.KSP_AFFILIATE_ID || '14887'

// Base KSP URL
const KSP_BASE_URL = 'https://ksp.co.il'

/**
 * Generate a direct KSP affiliate link (for Telegram, etc.)
 * Uses appkey parameter for simple tracking
 */
export function generateDirectAffiliateLink(sku: string): string {
  return `${KSP_BASE_URL}/web/item/${sku}?appkey=${KSP_AFFILIATE_ID}`
}

/**
 * Generate a tracked affiliate link through our redirect
 * This logs clicks for revenue tracking
 */
export function generateTrackedAffiliateLink(
  productId: string,
  platform: 'telegram' | 'site' | 'whatsapp' | 'instagram' | 'facebook' = 'site',
  language: 'he' | 'en' = 'he',
  baseUrl: string = 'https://smartbuy.co.il'
): string {
  return `${baseUrl}/go/${productId}?channel=${platform}&lang=${language}`
}

/**
 * Parse affiliate click ID from KSP report's UIN column
 * Format: AFFILIATE_ID_clickId
 */
export function parseClickIdFromUin(uin: string): string | null {
  if (!uin) return null
  
  // Check if it matches our format
  if (uin.startsWith(`${KSP_AFFILIATE_ID}_`)) {
    return uin.replace(`${KSP_AFFILIATE_ID}_`, '')
  }
  
  return null
}

/**
 * Build KSP URL with full tracking (for redirect route)
 */
export function buildKspTrackingUrl(kspUrl: string, clickId: string): string {
  const url = new URL(kspUrl)
  url.searchParams.set('uin', `${KSP_AFFILIATE_ID}_${clickId}`)
  return url.toString()
}

/**
 * Platform display names and icons
 */
export const PLATFORMS = {
  telegram: { name: 'Telegram', icon: '📱', color: '#0088cc' },
  site: { name: 'Website', icon: '🌐', color: '#4CAF50' },
  whatsapp: { name: 'WhatsApp', icon: '💬', color: '#25D366' },
  instagram: { name: 'Instagram', icon: '📷', color: '#E4405F' },
  facebook: { name: 'Facebook', icon: '👤', color: '#1877F2' },
} as const

export type Platform = keyof typeof PLATFORMS
export type Language = 'he' | 'en'
