import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KITA - Financial Assistant',
    short_name: 'KITA',
    description: 'Premium Couple Financial Assistant',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#8b5cf6',
    icons: [
      {
        src: '/icon512_maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon512_rounded.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
