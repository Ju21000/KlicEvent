'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import JSZip from 'jszip';

export default function AdminGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    async function initAdmin() {
      // 1. Vérification session organisateur
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Récupération de l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        router.push('/dashboard');
        return;
      }

      setEvent(eventData);

      // 3. Récupération des photos
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (photosData) {
        setPhotos(photosData);
      }

      setLoading(false);

      // 4. Écoute temps réel
      channel = supabase
        .channel(`admin:photos:${eventData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload: { new: any }) => {
            setPhotos((prev) => [payload.new, ...prev]);
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
            setPhotos((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        )
        .subscribe();
    }

    initAdmin();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [slug, router]);

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Supprimer définitivement cette photo ?')) return;

    try {
      const urlParts = photoUrl.split('/event-photos/');
      if (urlParts.length > 1) {
        await supabase.storage.from('event-photos').remove([urlParts[1]]);
      }

      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error('Erreur suppression :', err);
      alert('Impossible de supprimer la photo.');
    }
  };

  // Téléchargement de l'archive ZIP
  const handleDownloadZip = async () => {
    if (photos.length === 0) {
      alert('Aucune photo à télécharger.');
      return;
    }

    setDownloadingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`photos-${slug}`) || zip;

      let completed = 0;

      await Promise.all(
        photos.map(async (photo, index) => {
          try {
            const imageUrl = photo.url || photo.image_url;
            const res = await fetch(imageUrl);
            const blob = await res.blob();

            const ext = blob.type === 'image/png' ? 'png' : 'jpg';
            const filename = `photo-${String(index + 1).padStart(3, '0')}.${ext}`;

            folder.file(filename, blob);
          } catch (fetchErr) {
            console.error('Erreur lors du téléchargement d’une photo :', fetchErr);
          } finally {
            completed++;
            setZipProgress(Math.round((completed / photos.length) * 100));
          }
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${slug}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Erreur génération ZIP :', err);
      alert("Une erreur est survenue lors de la création de l'archive ZIP.");
    } finally {
      setDownloadingZip(false);
      setZipProgress(0);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Chargement de la galerie...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">
              Modération organisateur
            </span>
            <h1 className="text-3xl font-bold mt-1">{event.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {photos.length} photo{photos.length > 1 ? 's' : ''} reçue{photos.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip || photos.length === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              {downloadingZip ? `Archive en cours (${zipProgress}%) ⏳` : '📥 Télécharger ZIP'}
            </button>

            <Link
              href={`/events/${slug}/slideshow`}
              target="_blank"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition shadow-lg flex items-center gap-1.5"
            >
              📺 Lancer le Live
            </Link>

            <Link
              href="/dashboard"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition border border-slate-700"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Grille des photos */}
        {photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <p className="text-xl text-slate-400 font-medium">Aucune photo pour le moment.</p>
            <p className="text-sm text-slate-500">
              Les photos envoyées par les invités apparaîtront ici automatiquement.
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
                  className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white w-9 h-9 rounded-xl flex items-center justify-center transition shadow-lg cursor-pointer"
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