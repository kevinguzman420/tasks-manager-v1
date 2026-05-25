import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Diario · Planeador',
    short_name: 'Planeador',
    description: 'Diseña tu día productivo, hora por hora.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf9f7',
    theme_color: '#1b1712',
    categories: ['productivity', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // SVG fallback para navegadores modernos
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
