'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function LiveSlideshowPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventAndPhotos = async () => {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData);

      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (!photosError && photosData) {
        setPhotos(photosData);
      }

      setLoading(false);
    };

    fetchEventAndPhotos();
  }, [slug]);

  useEffect(() => {
    if (!event) return;

    const channel = supabase
      .channel(`public:photos:event_id=eq.${event.id}`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event]);

  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl animate-pulse">Chargement du diaporama...</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl text-red-400">Événement introuvable.</p>
      </main>
    );
  }

  const eventUrl = `https://www.KlicEvent.com/events/${slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(eventUrl)}`;
  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;

  return (
    <main className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden p-6">
      
      {/* En-tête avec titre et rappel de la plateforme */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 backdrop-blur">
          {event.title}
        </h1>
        <span className="text-sm font-semibold text-purple-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 backdrop-blur">
          www.KlicEvent.com
        </span>
      </div>

      {/* Affichage des photos du diaporama */}
      <div className="flex-1 w-full flex items-center justify-center my-auto">
        {currentPhoto ? (
          <div className="relative max-w-5xl max-h-[75vh] w-full h-[75vh] flex items-center justify-center">
            <img
              src={currentPhoto.url}
              alt="Photo live"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-slate-800/80 animate-fade-in"
            />
          </div>
        ) : (
          <div className="text-center space-y-4 p-12 bg-slate-900/50 border border-slate-800 rounded-3xl max-w-lg">
            <p className="text-2xl font-semibold text-slate-300">En attente des premières photos...</p>
            <p className="text-sm text-slate-400">Scannez le QR code pour balancer vos photos en direct ! 📸</p>
          </div>
        )}
      </div>

      {/* QR Code en bas à droite pour flasher et ajouter des photos */}
      <div className="absolute bottom-6 right-6 z-20 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur flex items-center gap-4 shadow-2xl">
        <div className="bg-white p-2 rounded-xl">
          <img src={qrCodeUrl} alt="QR Code pour ajouter des photos" className="w-24 h-24 object-contain" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-white">Scannez pour ajouter</p>
          <p className="text-xs text-purple-400 font-medium">vos photos en direct !</p>
          <p className="text-xs font-bold text-slate-300 pt-1">www.KlicEvent.com</p>
        </div>
      </div>

    </main>
  );
}