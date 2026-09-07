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
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
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
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload: { old: any }) => {
            setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== payload.old.id));
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

  // Diaporama automatique
  useEffect(() => {
    if (isSlideshowOpen && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isSlideshowOpen, photos.length]);

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

  // Fonction pour supprimer une photo
  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) return;

    try {
      // 1. Extraire le chemin du fichier dans le storage à partir de l'URL publique
      const urlParts = photoUrl.split('/event-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('event-photos').remove([filePath]);
      }

      // 2. Supprimer l'entrée de la table photos
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // 3. Mettre à jour l'état local immédiatement
      setPhotos((prev) => {
        const updated = prev.filter((p) => p.id !== photoId);
        if (updated.length === 0) {
          setIsSlideshowOpen(false);
        } else if (currentIndex >= updated.length) {
          setCurrentIndex(updated.length - 1);
        }
        return updated;
      });
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert("Impossible de supprimer la photo.");
    }
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
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsSlideshowOpen(true);
              }}
              disabled={photos.length === 0}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
            >
              🎬 Diaporama Plein Écran
            </button>

            <label className="text-center px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition border border-slate-700 cursor-pointer">
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

        {/* Grille principale avec bouton de suppression sur chaque photo */}
        {photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <p className="text-xl text-slate-400 font-medium">Aucune photo pour le moment.</p>
            <p className="text-sm text-slate-500">Sois le premier à immortaliser un moment de cet événement !</p>
          </div>
        ) : (
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id, photo.url);
                  }}
                  title="Supprimer la photo"
                  className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white w-9 h-9 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Plein Écran Diaporama avec bouton de suppression */}
      {isSlideshowOpen && photos.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between p-6">
          <div className="w-full max-w-7xl flex justify-between items-center text-white">
            <h2 className="text-xl font-bold">{event.title} (Diaporama Live)</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDeletePhoto(photos[currentIndex].id, photos[currentIndex].url)}
                className="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold border border-red-500 transition cursor-pointer"
              >
                🗑️ Supprimer cette photo
              </button>
              <button
                onClick={() => setIsSlideshowOpen(false)}
                className="bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 transition cursor-pointer"
              >
                Fermer ✕
              </button>
            </div>
          </div>

          <div className="relative flex-1 w-full max-w-6xl max-h-[80vh] flex items-center justify-center my-4">
            <img
              src={photos[currentIndex]?.url}
              alt="Diaporama plein écran"
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-500"
            />
          </div>

          <div className="w-full max-w-xl flex items-center justify-between text-slate-400 text-sm">
            <button
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 transition cursor-pointer"
            >
              ← Précédent
            </button>
            <span>
              Photo {currentIndex + 1} / {photos.length}
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % photos.length)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-800 transition cursor-pointer"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}