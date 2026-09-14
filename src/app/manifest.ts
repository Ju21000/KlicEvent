import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KlicEvent — Live Diaporama & Photos',
    short_name: 'KlicEvent',
    description: 'Partage instantané de photos et diaporama live pour vos événements.',
    start_url: '/',
    display: 'standalone', // Supprime la barre d'adresse pour donner l'effet appli native
    background_color: '#07050f',
    theme_color: '#9333ea',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}