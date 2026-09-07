'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SlideshowPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [photos, setPhotos] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // 1. Charger les photos initiales
    async function fetchPhotos() {
      const { data } = await supabase
        .from('photos')
        .select('*')
        .eq('event_slug', slug)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setPhotos(data);
      }
    }

    fetchPhotos();

    // 2. Écouter les nouvelles photos en temps réel
    const channel = supabase
      .channel(`public:photos:event_slug=eq.${slug}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photos',
          filter: `event_slug=eq.${slug}`,
        },
        (payload) => {
          setPhotos((prev) => [payload.new, ...prev]);
          setCurrentIndex(0); // Revient sur la toute dernière photo uploadée
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  // Rotation automatique toutes les 5 secondes s'il y a plusieurs photos
  useEffect(() => {
    if (photos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Barre supérieure */}
      <div className="w-full flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Diaporama Live 🔴
          </span>
          <h1 className="text-xl font-bold mt-1">Événement #{slug}</h1>
        </div>
        <Link
          href={`/events/${slug}`}
          className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-sm font-medium rounded-lg backdrop-blur-md transition"
        >
          Quitter le live ✕
        </Link>
      </div>

      {/* Affichage de la photo active */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full p-4">
        {photos.length === 0 ? (
          <div className="text-center space-y-3">
            <p className="text-2xl font-semibold text-slate-400">En attente des premières photos... 📸</p>
            <p className="text-sm text-slate-600">Scannez le QR code pour balancer vos clichés sur le grand écran !</p>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              key={photos[currentIndex]?.id}
              src={photos[currentIndex]?.url}
              alt="Slide live"
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-all duration-700 animate-fade-in"
            />
          </div>
        )}
      </div>

      {/* Barre inférieure / Compteur */}
      <div className="text-xs text-slate-500 pb-2">
        {photos.length > 0 ? `${currentIndex + 1} / ${photos.length} photos` : 'Aucune photo'}
      </div>
    </main>
  );
}