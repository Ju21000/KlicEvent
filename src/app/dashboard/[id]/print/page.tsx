'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

interface EventData {
  id: string;
  title: string;
  slug?: string;
}

export default function PrintKitPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;

      const { data, error } = await supabase
        .from('events')
        .select('id, title, slug')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        console.error("Erreur lors de la récupération de l'événement :", error);
        router.push('/dashboard');
        return;
      }

      setEvent(data);
      setLoading(false);
    }

    loadEvent();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Chargement du kit d'impression...
      </div>
    );
  }

  // URL scannée par les invités
  const guestUrl = `https://www.klicevent.com/events/${event?.slug || event?.id}`;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-4 sm:p-8 print:p-0 print:bg-white">
      {/* Barre d'action masquée à l'impression */}
      <div className="max-w-[190mm] mx-auto mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-neutral-200 print:hidden">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
          >
            ← Retour au tableau de bord
          </button>
          <p className="text-sm font-medium text-neutral-700 mt-1">
            Format A4 optimisé — deux chevalets prêts à découper ou plier
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Imprimer (Ctrl + P)
        </button>
      </div>

      {/* Feuille A4 : 2 fiches chevalets par page */}
      <div className="max-w-[190mm] mx-auto flex flex-col justify-between h-[277mm] print:h-[297mm] print:m-0 print:max-w-none">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="border-2 border-dashed border-neutral-300 rounded-3xl p-8 h-[48%] flex flex-col justify-between items-center text-center bg-white"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
                Photobooth Live
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mt-1">
                {event?.title}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Partagez vos photos en direct sur le grand écran !
              </p>
            </div>

            {/* QR Code */}
            <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm inline-block">
              <QRCodeSVG value={guestUrl} size={170} level="M" />
            </div>

            {/* Étapes simples */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md text-center">
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5">
                <span className="block font-bold text-neutral-900 text-sm">1</span>
                <span className="text-xs text-neutral-600">Scannez</span>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5">
                <span className="block font-bold text-neutral-900 text-sm">2</span>
                <span className="text-xs text-neutral-600">Photographiez</span>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5">
                <span className="block font-bold text-neutral-900 text-sm">3</span>
                <span className="text-xs text-neutral-600">Regardez l'écran</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Sans application à télécharger • Sans création de compte • Propulsé par KlicEvent
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}