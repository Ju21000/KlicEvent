'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import confetti from 'canvas-confetti';

function SuccessCard() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [event, setEvent] = useState<{ title: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981'],
      });
    } catch {
      // Évite tout crash si confetti n'est pas prêt
    }

    async function loadEvent() {
      if (!eventId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('events')
        .select('title, slug')
        .eq('id', eventId)
        .single();

      if (data) {
        setEvent(data);
      }
      setLoading(false);
    }

    loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Finalisation de ton événement...</p>
      </div>
    );
  }

  const slug = event?.slug;

  return (
    <div className="relative z-10 w-full max-w-lg bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4 shadow-lg">
        🎉
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">
          Événement prêt et activé
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
        {event?.title || 'Félicitations !'}
      </h1>

      <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">
        Ton live photo est configuré. Tu peux dès maintenant lancer le diaporama sur grand écran ou partager le lien avec tes invités.
      </p>

      {slug ? (
        <div className="w-full flex flex-col gap-3">
          <Link
            href={`/events/${slug}/slideshow`}
            target="_blank"
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl transition-all active:scale-[0.98]"
          >
            Lancer le Diaporama Plein Écran 📺
          </Link>

          <Link
            href={`/events/${slug}`}
            target="_blank"
            className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 font-medium text-sm transition-all active:scale-[0.98]"
          >
            Tester la page Invités 📸
          </Link>
        </div>
      ) : (
        <Link
          href="/"
          className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 font-medium text-sm transition-all"
        >
          Retour à l'accueil
        </Link>
      )}

      <p className="text-[10px] text-slate-500 font-medium mt-6">
        Propulsé par <span className="text-slate-400 font-semibold">KlicEvent</span>
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen w-full bg-[#07050f] text-white flex items-center justify-center p-4 selection:bg-purple-600">
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <Suspense
        fallback={
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        }
      >
        <SuccessCard />
      </Suspense>
    </main>
  );
}