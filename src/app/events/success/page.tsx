'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Appel à ton API pour vérifier la session Stripe et créer l'événement en BDD
    fetch(`/api/verify-session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEventData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Erreur lors de la validation du paiement.');
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-purple-400 text-lg animate-pulse">Validation de votre paiement et création de l'événement...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold mb-2">Oups !</h2>
          <p>{error}</p>
          <Link href="/create-event" className="mt-4 inline-block px-4 py-2 bg-slate-800 rounded-lg text-white">
            Réessayer
          </Link>
        </div>
      </main>
    );
  }

  const galleryUrl = eventData?.galleryUrl || `${window.location.origin}/events/demo-event`;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6 text-center">
        <div className="w-12 h-12 bg-green-500/10 border border-green-500 text-green-400 rounded-full flex items-center justify-center mx-auto text-xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-purple-400">Paiement validé avec succès ! 🎉</h1>
        <p className="text-slate-300 text-sm">
          Votre événement est prêt. Partagez le QR code ou le lien ci-dessous avec vos invités pour qu'ils puissent y déposer leurs photos.
        </p>

        {/* Affichage du QR Code */}
        <div className="bg-white p-4 rounded-xl inline-block shadow-md">
          <QRCodeSVG value={galleryUrl} size={180} level="H" />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
            Lien direct vers la galerie
          </label>
          <input
            type="text"
            readOnly
            value={galleryUrl}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-sm text-center select-all"
          />
        </div>

        <Link
          href={galleryUrl}
          className="w-full block py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-200 shadow-lg hover:shadow-purple-500/25"
        >
          Accéder à ma galerie
        </Link>
      </div>
    </main>
  );
}