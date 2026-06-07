import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rabbit — Hyperlocal Delivery',
    short_name: 'Rabbit',
    description: 'Order from local kirana, fish, vegetables & more near you. Fast delivery.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF6B35',
    orientation: 'portrait',
    categories: ['food', 'shopping', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Browse Shops',
        url: '/shops',
        description: 'Browse local shops near you',
      },
      {
        name: 'My Orders',
        url: '/orders',
        description: 'View your order history',
      },
    ],
  }
}
