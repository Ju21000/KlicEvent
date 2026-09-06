'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import JSZip from 'jszip';
import { QRCodeSVG } from 'qrcode.react';

interface Event {
  id: string;
  title: string;
  date: string;
  slug: string;
  max_photos: number;
  plan_type: string;
  price: number;
  payment_status: string;
}

interface Photo {
  id: string;
  image_url: string;
}

export default function EventGalleryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const isSuccess = searchParams.get('success') === 'true';

  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [paying, setPaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }

    async function loadData() {
      if (!slug) return;

      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .single();

        if (eventError || !eventData) {
          console.error("Erreur événement:", eventError);
          setLoading(false);
          return;
        }

        setEvent(eventData);

        const { data: photosData, error: photosError } = await supabase
          .from('photos')
          .select('*')
          .eq('event_id', eventData.id)
          .order('created_at', { ascending: false });

        if (photosError) {
          console.error("Erreur photos:", photosError);
        } else {
          setPhotos(photosData || []);
        }
      } catch (err) {
        console.error("Erreur générale:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activePhotoIndex !== null && photos.length > 0) {
      interval = setInterval(() => {
        setActivePhotoIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activePhotoIndex, photos.length]);

  const handleOpenModal = (index: number) => {
    setActivePhotoIndex(index);
    setIsPlaying(false);
    setTimeout(() => {
      if (modalRef.current && modalRef.current.requestFullscreen) {
        modalRef.current.requestFullscreen().catch(() => {});
      }
    }, 50);
  };

  const handleCloseModal = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActivePhotoIndex(null);
    setIsPlaying(false);
  };

  const handleDownloadSingle = async (imageUrl: string, photoId: string) => {
    try {
      setDownloadingSingle(true);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `souvenir-${photoId.slice(0, 8)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Impossible de télécharger l'image.");
    } finally {
      setDownloadingSingle(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (photos.length === 0) return;

    try {
      setDownloadingAll(true);
      const zip = new JSZip();
      const folder = zip.folder("souvenirs-evenement");

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const response = await fetch(photo.image_url);
        const blob = await response.blob();
        folder?.file(`photo-${i + 1}.jpg`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${event?.slug || 'galerie'}-toutes-les-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error("Erreur lors de la création du ZIP :", err);
      alert("Erreur lors du téléchargement groupé.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleStripeCheckout = async () => {
    try {
      setPaying(true);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event?.id,
          title: event?.title,
          price: event?.price,
          slug: event?.slug,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur lors de la redirection vers Stripe.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Chargement de la galerie...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <p className="text-rose-400 mb-4">Événement introuvable.</p>
        <Link href="/events" className="text-purple-400 hover:underline">← Retour</Link>
      </div>
    );
  }

  const isLimitReached = photos.length >= (event.max_photos || 20);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Galerie privée</span>
            <h1 className="text-3xl font-bold mt-1 text-white">{event.title}</h1>
            <p className="text-slate-400 text-sm mt-1">
              📅 Événement du {event.date} • Formule : <span className="text-purple-300 font-medium uppercase">{event.plan_type || 'demo'}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {photos.length > 0 && (
              <button
                onClick={handleDownloadAllZip}
                disabled={downloadingAll}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                📦 {downloadingAll ? "Génération du ZIP..." : "Tout télécharger (.zip)"}
              </button>
            )}
            <Link
              href="/events"
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition"
            >
              ← Retour
            </Link>
          </div>
        </div>

        {/* Section Quota & QR Code de l'événement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Indicateur de Quota */}
          <div className="md:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-xl">
            <div>
              <p className="text-sm font-medium text-slate-300">Quota de stockage des souvenirs :</p>
              <p className="text-xs text-slate-400 mt-1">
                <span className="text-purple-400 font-bold text-base">{photos.length}</span> sur <span className="font-bold text-base">{event.max_photos || 20}</span> photos utilisées
              </p>
            </div>
            
            {isLimitReached && event.plan_type === 'demo' && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-amber-400">Limite de la formule démo atteinte.</span>
                <button
                  onClick={handleStripeCheckout}
                  disabled={paying}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  🔒 {paying ? "Redirection..." : `Déverrouiller (${event.price}€)`}
                </button>
              </div>
            )}
          </div>

          {/* QR Code Partenaire / Invités */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-white p-2.5 rounded-xl shrink-0">
              {currentUrl ? (
                <QRCodeSVG value={currentUrl} size={90} />
              ) : (
                <div className="w-[90px] h-[90px] bg-slate-200 animate-pulse rounded-lg" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">QR Code Invités</h3>
              <p className="text-slate-400 text-xs mt-1">
                Flashez pour partager ou accéder directement à la galerie.
              </p>
            </div>
          </div>
        </div>

        {isSuccess && (
          <div className="mb-6 p-4 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-2xl text-center text-sm shadow-xl">
            🎉 Paiement validé avec succès ! Merci pour votre achat, l'accès à la galerie est déverrouillé.
          </div>
        )}

        {photos.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
            <span className="text-4xl mb-4 block">📸</span>
            <h2 className="text-xl font-semibold text-white mb-2">Les photos arrivent bientôt !</h2>
            <p className="text-slate-400 text-sm mb-6">Partagez le lien ou le QR code de cet événement pour que les participants commencent à uploader leurs souvenirs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => handleOpenModal(index)}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl cursor-pointer aspect-square"
              >
                <img
                  src={photo.image_url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                  <span className="text-white text-sm font-medium bg-purple-600 px-4 py-2 rounded-xl shadow-lg">
                    🔍 Plein écran / Diaporama
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePhotoIndex !== null && (
          <div ref={modalRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-white text-3xl font-bold bg-slate-800/80 hover:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer z-10"
            >
              &times;
            </button>

            <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white text-sm font-semibold bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                {isPlaying ? "⏸️ Pause" : "▶️ Diaporama auto"}
              </button>

              <button
                onClick={() => handleDownloadSingle(photos[activePhotoIndex].image_url, photos[activePhotoIndex].id)}
                disabled={downloadingSingle}
                className="text-white text-sm font-semibold bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                📥 {downloadingSingle ? "Téléchargement..." : "Télécharger cette photo"}
              </button>
            </div>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActivePhotoIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1));
              }}
              className="absolute left-6 text-white text-2xl bg-slate-800/80 hover:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer"
            >
              &#8592;
            </button>

            <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
              <img
                key={photos[activePhotoIndex].id}
                src={photos[activePhotoIndex].image_url}
                alt="Plein écran"
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-500"
              />
              <p className="text-slate-400 text-sm mt-4 flex items-center gap-3">
                <span>Photo {activePhotoIndex + 1} sur {photos.length}</span>
                {isPlaying && <span className="text-purple-400 animate-pulse text-xs">● Lecture auto en cours</span>}
              </p>
            </div>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActivePhotoIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
              }}
              className="absolute right-6 text-white text-2xl bg-slate-800/80 hover:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer"
            >
              &#8594;
            </button>
          </div>
        )}
      </div>
    </main>
  );
}