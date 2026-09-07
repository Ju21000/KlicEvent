'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';

export default function EventGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    async function fetchPhotos() {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_slug', slug)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPhotos(data);
      }
      setLoading(false);
    }

    fetchPhotos();
  }, [slug]);

  // Fonction pour télécharger toutes les photos en ZIP
  const handleDownloadAll = async () => {
    if (photos.length === 0) return;

    setDownloadingZip(true);
    const zip = new JSZip();
    const folder = zip.folder(`klic-event-${slug}`);

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const response = await fetch(photo.url);
        const blob = await response.blob();
        
        // Extrait l'extension du fichier ou met .jpg par défaut
        const extension = photo.url.split('.').pop()?.split('?')[0] || 'jpg';
        folder?.file(`photo-${i + 1}.${extension}`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evenement-${slug}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de la création du ZIP :", error);
      alert("Une erreur est survenue lors du téléchargement groupé.");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* En-tête de la galerie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Galerie Événement
            </span>
            <h1 className="text-3xl font-bold mt-2">Événement #{slug}</h1>
            <p className="text-slate-400 text-sm mt-1">Partagez et téléchargez les photos de la soirée !</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingZip}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white font-medium rounded-xl transition duration-200 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {downloadingZip ? 'Génération du ZIP...' : '📥 Tout télécharger'}
              </button>
            )}
            <Link
              href={`/events/${slug}/slideshow`}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-purple-300 font-medium rounded-xl transition duration-200 border border-slate-700 flex items-center gap-2"
            >
              🖥️ Diaporama Live
            </Link>
            <Link
              href={`/upload?event=${slug}`}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition duration-200 shadow-lg hover:shadow-purple-500/25 text-center"
            >
              Déposer des photos 📸
            </Link>
          </div>
        </div>

        {/* Grille de photos */}
        {loading ? (
          <p className="text-center text-purple-400 animate-pulse">Chargement des souvenirs...</p>
        ) : photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto text-2xl">
              🖼️
            </div>
            <h2 className="text-xl font-semibold text-slate-300">Aucune photo pour le moment</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Sois le premier à immortaliser ce moment en téléversant tes clichés depuis ton téléphone !
            </p>
            <Link
              href={`/upload?event=${slug}`}
              className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition duration-200"
            >
              Ajouter des photos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group">
                <div className="aspect-square relative overflow-hidden bg-slate-950">
                  <img
                    src={photo.url}
                    alt="Photo événement"
                    className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}