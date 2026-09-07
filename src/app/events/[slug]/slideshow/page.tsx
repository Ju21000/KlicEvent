'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SlideshowPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [eventData, setEventData] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const guestUploadUrl = `https://www.klicevent.com/events/${slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    guestUploadUrl
  )}`;

  useEffect(() => {
    async function initSlideshow() {
      // 1. Récupérer l'événement via son slug
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title')
        .eq('slug', slug)
        .single();

      if (eventError || !event) {
        console.error('Événement introuvable :', eventError);
        return;
      }

      setEventData(event);

      // 2. Charger les photos de cet événement précis
      const { data: initialPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (!photosError && initialPhotos) {
        setPhotos(initialPhotos);
      }

      // 3. Écouter les nouvelles photos en temps réel
      const channel = supabase
        .channel(`photos-event-${event.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${event.id}`,
          },
          (payload) => {
            setPhotos((prev) => [payload.new, ...prev]);
            setCurrentIndex(0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    initSlideshow();
  }, [slug]);

  // Rotation automatique toutes les 5 secondes
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col items-center justify-between p-6 overflow-hidden select-none">
      {/* Barre supérieure discrète */}
      <div className="w-full flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Diaporama Live 🔴
          </span>
          <h1 className="text-lg md:text-xl font-bold">
            {eventData ? eventData.title : `Événement #${slug}`}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-xs md:text-sm font-medium rounded-lg backdrop-blur-md transition cursor-pointer"
        >
          Quitter le live ✕
        </Link>
      </div>

      {/* Affichage de la photo centrale */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full p-4">
        {photos.length === 0 ? (
          <div className="text-center space-y-3 z-10">
            <p className="text-2xl md:text-3xl font-bold text-slate-300">
              En attente des premières photos... 📸
            </p>
            <p className="text-sm md:text-base text-slate-500">
              Scannez le QR code pour envoyer vos clichés en direct !
            </p>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              key={photos[currentIndex]?.id}
              src={photos[currentIndex]?.image_url || photos[currentIndex]?.url}
              alt="Slide live"
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-opacity duration-700 animate-fade-in"
            />
          </div>
        )}
      </div>

      {/* Badge QR Code & Branding KlicEvent fixé en bas à gauche */}
      <div className="fixed bottom-6 left-6 z-30 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl shadow-2xl">
        <div className="bg-white p-1.5 rounded-xl shrink-0">
          <img
            src={qrCodeUrl}
            alt="QR Code Invités"
            className="w-16 h-16 md:w-20 md:h-20 object-contain"
          />
        </div>
        <div className="text-left pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
            Partage tes photos
          </p>
          <p className="text-sm font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            KlicEvent.com
          </p>
          <p className="text-[10px] text-slate-400 max-w-[140px] truncate mt-0.5">
            /events/{slug}
          </p>
        </div>
      </div>

      {/* Compteur discret en bas à droite */}
      <div className="fixed bottom-6 right-6 z-20 text-xs text-slate-500 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/60">
        {photos.length > 0 ? `${currentIndex + 1} / ${photos.length} photos` : '0 photo'}
      </div>
    </main>
  );
}