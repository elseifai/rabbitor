import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@rabbit/database', 'leaflet', 'react-leaflet'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
}

export default nextConfig
