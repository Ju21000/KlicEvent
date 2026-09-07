'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { QRCodeSVG } from 'qrcode.react';

export default function EventGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.origin);

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

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Veux-tu vraiment supprimer cette photo ?")) return;

    try {
      const urlParts = photoUrl.split('/event-photos/');
      if (urlParts.length > 1) {
        await supabase.storage.from('event-photos').remove([urlParts[1]]);
      }

      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("Impossible de supprimer la photo.");
    }
  };

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
      console.error("Erreur ZIP :", error);
    } finally {
      setDownloadingZip(false);
    }
  };

  const uploadLink = `${currentUrl}/upload?event=${slug}`;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* En-tête de la galerie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Galerie Événement
            </span>
            <h1 className="text-3xl font-bold mt-2">Événement #{slug}</h1>
            <p className="text-slate-400 text-sm mt-1">Scanne le QR code pour balancer tes photos en direct !</p>
          </div>

          {/* QR Code d'accès rapide pour les invités */}
          {currentUrl && (
            <div className="bg-white p-3 rounded-xl shadow-lg flex flex-col items-center">
              <QRCodeSVG value={uploadLink} size={110} />
              <span className="text-[10px] text-slate-900 font-bold mt-2 uppercase tracking-wider">Flsh pour uploader</span>
            </div>
          )}
        </div>

        {/* Barre d'actions organisateur */}
        <div className="flex flex-wrap gap-3 items-center justify-between bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← Accueil KlicEvent
          </Link>
          <div className="flex flex-wrap gap-3 items-center">
            {photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingZip}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-lg cursor-pointer"
              >
                {downloadingZip ? 'Génération...' : '📥 Tout télécharger (ZIP)'}
              </button>
            )}
            <Link
              href={`/events/${slug}/slideshow`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-sm font-medium rounded-lg transition border border-slate-700"
            >
              🖥️ Diaporama Live
            </Link>
            <Link
              href={`/upload?event=${slug}`}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition shadow-lg"
            >
              Déposer 📸
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
              Scanne le QR code ci-dessus pour envoyer les premiers clichés !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg group relative">
                <div className="aspect-square relative overflow-hidden bg-slate-950">
                  <img
                    src={photo.url}
                    alt="Photo événement"
                    className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id, photo.url)}
                    className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition duration-200 shadow-lg cursor-pointer"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}