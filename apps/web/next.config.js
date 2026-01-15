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
    const path = require('path');
    
    // Mark @ksp/database and its dependencies as external for server bundles
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@ksp/database': 'commonjs @ksp/database',
        '@prisma/client': 'commonjs @prisma/client',
        '@libsql/client': 'commonjs @libsql/client',
      });
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ksp/database': path.resolve(__dirname, '../../packages/database/dist'),
      '@ksp/shared': path.resolve(__dirname, '../../packages/shared'),
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
