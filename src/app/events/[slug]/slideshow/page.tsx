'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Photo {
  id: string;
  url: string;
}

export default function SlideshowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Chargement des photos et écoute temps réel
  useEffect(() => {
    async function fetchPhotos() {
      const { data: eventData } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!eventData) return;

      const { data: photosData } = await supabase
        .from('photos')
        .select('id, url')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (photosData) {
        setPhotos(photosData);
      }
      setLoading(false);

      // Réception instantanée d'une nouvelle photo
      const channel = supabase
        .channel(`slideshow-${eventData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload) => {
            setPhotos((prev) => [payload.new as Photo, ...prev]);
            setCurrentIndex(0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    fetchPhotos();
  }, [slug]);

  // 2. Défilement automatique toutes les 6 secondes
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [photos.length]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-slate-500 text-sm">Chargement du diaporama...</p>
      </main>
    );
  }

  if (photos.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <p className="text-slate-400">En attente de la première photo...</p>
      </main>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      {photos.map((photo, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={photo.id}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={photo.url}
              alt="Photo de l'événement"
              className={`max-w-full max-h-full object-contain transition-transform duration-[6000ms] ease-out ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
            />
          </div>
        );
      })}
    </main>
  );
}