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

  // Upload sécurisé avec vérification de l'existence de l'événement en base
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    setUploading(true);

    try {
      const { data: checkEvent, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('id', event.id)
        .single();

      if (checkError || !checkEvent) {
        alert("Cet événement n'existe plus ou a été supprimé.");
        router.push('/dashboard');
        return;
      }

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
    } catch (err) {
      console.error("Erreur lors de l'upload :", err);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploading(false);
    }
  };

  // Suppression d'une photo
  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) return;

    try {
      const urlParts = photoUrl.split('/event-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('event-photos').remove([filePath]);
      }

      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
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
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">
              Galerie & Modération
            </span>
            <h1 className="text-3xl font-bold mt-1">{event.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {photos.length} photo{photos.length > 1 ? 's' : ''} partagée{photos.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <Link
              href={`/events/${slug}/slideshow`}
              target="_blank"
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition shadow-lg flex items-center gap-2"
            >
              📺 Lancer le Live
            </Link>

            <label className="text-center px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition border border-slate-700 cursor-pointer">
              {uploading ? 'Envoi...' : '📸 Ajouter une photo'}
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

        {/* Grille principale des photos pour modération */}
        {photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <p className="text-xl text-slate-400 font-medium">Aucune photo pour le moment.</p>
            <p className="text-sm text-slate-500">
              Les photos envoyées par les invités apparaîtront ici en temps réel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group"
              >
                <img
                  src={photo.url || photo.image_url}
                  alt="Photo de l'événement"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.url || photo.image_url)}
                  title="Supprimer la photo"
                  className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white w-9 h-9 rounded-xl flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-lg cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}