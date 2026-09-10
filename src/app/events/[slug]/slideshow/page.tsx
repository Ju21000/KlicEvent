'use client';

import { use, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface Photo {
  id: string;
  url: string;
  sender_name?: string;
  caption?: string;
  created_at: string;
}

export default function LiveSlideshowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eventTitle, setEventTitle] = useState('');
  const [guestUrl, setGuestUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Initialisation : récupération événement, URL invité et photos existantes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGuestUrl(`${window.location.origin}/events/${slug}`);
    }

    async function initSlideshow() {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title')
        .eq('slug', slug)
        .single();

      if (!eventData) return;
      setEventTitle(eventData.title);

      const { data: photosData } = await supabase
        .from('photos')
        .select('id, url, sender_name, caption, created_at')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (photosData && photosData.length > 0) {
        setPhotos(photosData);
      }

      // 2. Écoute temps réel des nouvelles photos projetées
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
            const newPhoto = payload.new as Photo;
            setPhotos((prev) => [newPhoto, ...prev]);
            setCurrentIndex(0); // Projette immédiatement le nouveau cliché reçu
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    initSlideshow();
  }, [slug]);

  // 3. Rotation automatique (toutes les 7 secondes)
  useEffect(() => {
    if (photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [photos.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const currentPhoto = photos[currentIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-[#05030a] text-white overflow-hidden select-none flex items-center justify-center"
    >
      {/* Arrière-plan flou dynamique pour remplir les écrans larges */}
      {currentPhoto && (
        <div
          key={`bg-${currentPhoto.id}`}
          style={{ backgroundImage: `url(${currentPhoto.url})` }}
          className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-30 scale-110 transition-opacity duration-1000"
        />
      )}

      {/* Projection centrale avec animation Ken Burns */}
      {photos.length > 0 ? (
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
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
                  alt="Souvenir live"
                  className={`max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-[7000ms] ease-out ${
                    isActive ? 'scale-105 translate-y-[-1%]' : 'scale-100'
                  }`}
                />

                {/* Légende en bas à gauche */}
                {(photo.sender_name || photo.caption) && isActive && (
                  <div className="absolute bottom-10 left-10 max-w-lg bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-2xl">
                    {photo.sender_name && (
                      <p className="text-xs uppercase tracking-wider font-semibold text-purple-300">
                        {photo.sender_name}
                      </p>
                    )}
                    {photo.caption && (
                      <p className="text-sm md:text-base font-medium text-slate-100 mt-0.5">
                        « {photo.caption} »
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center space-y-4 z-10">
          <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl mx-auto animate-pulse">
            📸
          </div>
          <h2 className="text-2xl font-bold text-slate-200">En attente des premières photos...</h2>
          <p className="text-sm text-slate-400">Scannez le QR code pour ouvrir le bal !</p>
        </div>
      )}

      {/* Badge QR code discret en bas à droite */}
      {guestUrl && (
        <div className="absolute bottom-8 right-8 z-20 flex items-center gap-4 bg-black/65 backdrop-blur-xl border border-white/15 p-3.5 rounded-2xl shadow-2xl">
          <div className="bg-white p-2 rounded-xl shadow-md">
            <QRCodeSVG value={guestUrl} size={90} level="M" />
          </div>
          <div className="text-left pr-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live
            </span>
            <p className="text-xs font-bold text-white mt-1">Partagez vos photos</p>
            <p className="text-[11px] text-slate-400">Scannez avec votre téléphone</p>
          </div>
        </div>
      )}

      {/* Titre événement et contrôle plein écran en haut */}
      <div className="absolute top-6 left-8 right-8 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full">
          <p className="text-xs font-medium text-slate-300 tracking-wide">{eventTitle}</p>
        </div>

        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto bg-black/40 hover:bg-white/10 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-full transition"
        >
          {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
        </button>
      </div>
    </div>
  );
}