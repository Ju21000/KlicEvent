'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function GuestUploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, max_photos')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        router.push('/');
        return;
      }

      setEvent(data);
      setLoading(false);
    }

    fetchEvent();
  }, [slug, router]);

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#a855f7', '#ec4899', '#3b82f6', '#fbbf24'],
      disableForReducedMotion: true,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    setUploading(true);
    setUploadSuccess(false);
    setErrorMessage('');

    try {
      const { count, error: countError } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      if (!countError && count !== null && event.max_photos && count >= event.max_photos) {
        setErrorMessage('La boîte à souvenirs est complète pour cet événement !');
        setUploading(false);
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

        if (uploadError) throw uploadError;

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

      setUploadSuccess(true);
      triggerCelebration();
      setTimeout(() => setUploadSuccess(false), 5000);
    } catch (err) {
      console.error("Erreur d'envoi :", err);
      setErrorMessage("Impossible d'envoyer la photo. Réessaie dans un instant.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07050f] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Connexion à la soirée...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#07050f] text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto overflow-y-auto selection:bg-purple-600">
      {/* Halos d'ambiance */}
      <div className="fixed top-[-10%] left-[-20%] w-[320px] h-[320px] bg-purple-600/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-[5%] right-[-20%] w-[320px] h-[320px] bg-pink-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* En-tête */}
      <header className="pt-2 sm:pt-4 relative z-10 text-center space-y-2 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold">
            Direct soirée
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent px-2">
          {event?.title}
        </h1>

        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Capture l'instant : ta photo apparaît directement sur le grand écran.
        </p>
      </header>

      {/* Zone centrale adaptative (portrait & paysage) */}
      <div className="relative z-10 flex flex-col items-center justify-center my-4 sm:my-auto w-full">
        {uploadSuccess && (
          <div className="mb-4 w-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-medium p-3 rounded-2xl backdrop-blur-xl shadow-xl flex items-center justify-center gap-2">
            <span>✨</span>
            <span>Photo projetée sur l'écran !</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 w-full bg-red-950/80 border border-red-500/40 text-red-200 text-xs sm:text-sm p-3 rounded-2xl backdrop-blur-xl shadow-xl flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Déclencheur responsive */}
        <label
          className={`group relative flex flex-col landscape:flex-row items-center justify-center gap-4 landscape:gap-6 w-full py-8 landscape:py-5 px-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 backdrop-blur-2xl transition-all duration-300 shadow-2xl cursor-pointer ${
            uploading ? 'pointer-events-none opacity-80' : 'active:scale-[0.98]'
          }`}
        >
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 blur-xl opacity-40 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/20 p-1 flex items-center justify-center bg-black/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '📸'
                )}
              </div>
            </div>
          </div>

          <div className="text-center landscape:text-left">
            <p className="font-bold text-base sm:text-lg text-white group-hover:text-purple-300 transition-colors">
              {uploading ? 'Envoi vers le live...' : 'Prendre une photo'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ou choisis dans ta galerie
            </p>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Pied de page */}
      <footer className="relative z-10 pt-2 pb-2 text-center shrink-0">
        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
          Propulsé par <span className="text-slate-400 font-bold tracking-wide">KlicEvent</span>
        </p>
      </footer>
    </main>
  );
}