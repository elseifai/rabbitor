import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs unsafe-inline for styles; tighten after moving to CSS modules/nonce
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Scripts: self + Next.js inline chunks (unsafe-inline required until nonce setup)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      // API, socket, Firebase, MSG91, Razorpay
      "connect-src 'self' https://api.msg91.com https://fcm.googleapis.com https://firebaseinstallations.googleapis.com https://api.razorpay.com wss:",
      // Images: all configured remote patterns
      "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://res.cloudinary.com https://placehold.co https://picsum.photos https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://cdn.zeptonow.com https://www.bigbasket.com",
      // Service worker for Firebase messaging
      "worker-src 'self' blob:",
      "frame-src https://checkout.razorpay.com https://api.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  transpilePackages: ['@rabbit/database', 'leaflet', 'react-leaflet'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'cdn.zeptonow.com' },
      { protocol: 'https', hostname: 'www.bigbasket.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async redirects() {
    return [{ source: '/home', destination: '/', permanent: true }]
  },
}

export default nextConfig
