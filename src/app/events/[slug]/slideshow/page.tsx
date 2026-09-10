'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface Photo {
  id: string;
  url: string;
  isPortrait?: boolean;
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

  // Détection de l'orientation d'une image
  const checkOrientation = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img.naturalHeight > img.naturalWidth);
      img.onerror = () => resolve(false);
    });
  };

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
        const photosWithOrientation = await Promise.all(
          photosData.map(async (p) => ({
            ...p,
            isPortrait: await checkOrientation(p.url),
          }))
        );
        setPhotos(photosWithOrientation);
      }
      setLoading(false);

      // Écoute des nouvelles photos en direct
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
          async (payload) => {
            const newPhoto = payload.new as Photo;
            const isPortrait = await checkOrientation(newPhoto.url);
            setPhotos((prev) => [{ ...newPhoto, isPortrait }, ...prev]);
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

  // Défilement automatique
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const current = photos[prev];
        const nextIdx = (prev + 1) % photos.length;
        if (current?.isPortrait && photos[nextIdx]?.isPortrait && photos.length > 2) {
          return (prev + 2) % photos.length;
        }
        return nextIdx;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [photos, currentIndex]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-slate-500 text-sm">Chargement du diaporama...</p>
      </main>
    );
  }

  const currentPhoto = photos[currentIndex];
  const nextPhoto = photos[(currentIndex + 1) % photos.length];
  const showDuo = currentPhoto?.isPortrait && nextPhoto?.isPortrait && photos.length > 1;

  return (
    <main className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      {photos.length > 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10 transition-opacity duration-1000 ease-in-out">
          {showDuo ? (
            /* Mode Duo centré, équilibré avec ratio strict 9/16 */
            <div className="flex items-center justify-center gap-6 md:gap-10 w-full h-[85vh]">
              {[currentPhoto, nextPhoto].map((photo, i) => (
                <div
                  key={photo.id + i}
                  className="relative h-full aspect-[9/16] max-w-[45vw] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-black/40"
                >
                  <img
                    src={photo.url}
                    alt="Photo live"
                    className="w-full h-full object-cover rounded-3xl transition-transform duration-[7000ms] ease-out scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Mode Solo (paysage ou portrait seul) */
            <div className="relative max-w-full max-h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-black/40">
              <img
                key={currentPhoto.id}
                src={currentPhoto.url}
                alt="Photo live"
                className="max-w-full max-h-[85vh] object-contain rounded-3xl transition-transform duration-[7000ms] ease-out scale-105"
              />
            </div>
          )}
        </div>
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