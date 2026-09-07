'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    async function fetchEventAndPhotos() {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        router.push('/');
        return;
      }

      setEvent(eventData);

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (photosData) {
        setPhotos(photosData);
      }

      setLoading(false);

      channel = supabase
        .channel(`public:photos:event_id=eq.${eventData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload: { new: any }) => {
            setPhotos((prevPhotos) => [payload.new, ...prevPhotos]);
          }
        )
        .subscribe();
    }

    fetchEventAndPhotos();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [slug, router]);

  // Effet pour faire tourner le diaporama automatiquement toutes les 4 secondes si activé
  useEffect(() => {
    if (viewMode === 'slideshow' && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [viewMode, photos.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${event.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(filePath);

        await supabase.from('photos').insert([
          {
            event_id: event.id,
            url: publicUrlData.publicUrl,
          },
        ]);
      }
    }

    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Chargement de l'événement...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Galerie Live KlicEvent</span>
            <h1 className="text-3xl font-bold mt-1">{event.title}</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* Boutons de bascule Grille / Diaporama */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Grille
              </button>
              <button
                onClick={() => setViewMode('slideshow')}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition ${viewMode === 'slideshow' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                🎬 Diaporama
              </button>
            </div>

            <label className="text-center px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-lg cursor-pointer">
              {uploading ? 'Envoi...' : '📸 Photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <Link
              href="/dashboard"
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition border border-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <p className="text-xl text-slate-400 font-medium">Aucune photo pour le moment.</p>
            <p className="text-sm text-slate-500">Sois le premier à immortaliser un moment de cet événement !</p>
          </div>
        ) : viewMode === 'slideshow' ? (
          /* Mode Diaporama immersif */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center space-y-4">
            <div className="relative w-full h-[60vh] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
              <img
                src={photos[currentIndex]?.url}
                alt="Diaporama en direct"
                className="max-h-full max-w-full object-contain transition-all duration-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl transition border border-slate-700"
              >
                ← Précédent
              </button>
              <span className="text-xs text-slate-400">
                Photo {currentIndex + 1} sur {photos.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % photos.length)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-xl transition border border-slate-700"
              >
                Suivant →
              </button>
            </div>
          </div>
        ) : (
          /* Mode Grille classique */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group"
              >
                <img
                  src={photo.url}
                  alt="Photo de l'événement"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}