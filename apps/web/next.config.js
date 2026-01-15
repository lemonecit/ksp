/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: i18n config is NOT used with App Router
  // We use [locale] folder structure + middleware instead
  
  // Image optimization for KSP images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ksp.co.il',
      },
      {
        protocol: 'https',
        hostname: '*.ksp.co.il',
      },
    ],
  },
  
  // Webpack configuration for monorepo support
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ksp/database': require.resolve('../../packages/database/src'),
      '@ksp/shared': require.resolve('../../packages/shared/src'),
    };
    return config;
  },
  
  // Headers for SEO
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
