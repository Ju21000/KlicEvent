'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

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
  const [guestUrl, setGuestUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGuestUrl(`${window.location.origin}/events/${slug}`);
    }

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

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      {/* Diaporama avec fondu et zoom doux */}
      {photos.length > 0 ? (
        photos.map((photo, index) => {
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
                alt="Photo live"
                className={`max-w-full max-h-full object-contain transition-transform duration-[6000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          );
        })
      ) : (
        <div className="text-center text-slate-400 z-10">
          <p className="text-lg font-medium">En attente de la première photo...</p>
          <p className="text-xs text-slate-600 mt-1">Scannez le QR code pour commencer</p>
        </div>
      )}

      {/* Bloc QR code en bas à droite */}
      {guestUrl && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 bg-black/80 border border-white/10 p-3 rounded-2xl backdrop-blur-md shadow-2xl">
          <div className="bg-white p-1.5 rounded-xl">
            <QRCodeSVG value={guestUrl} size={84} level="M" />
          </div>
          <div className="text-left text-white pr-2">
            <p className="text-xs font-bold leading-tight">Scannez pour</p>
            <p className="text-xs font-bold leading-tight">ajouter une photo</p>
          </div>
        </div>
      )}

      {/* Mention KlicEvent en bas à gauche */}
      <div className="absolute bottom-6 left-6 z-20 text-xs text-slate-500 font-medium">
        www.KlicEvent.com
      </div>
    </main>
  );
}