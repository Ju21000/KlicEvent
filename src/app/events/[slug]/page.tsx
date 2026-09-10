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
    <main className="min-h-screen w-full bg-[#07050f] text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-purple-600">
      {/* Halos d'ambiance en arrière-plan */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Carte unifiée et responsive */}
      <div className="relative z-10 w-full max-w-sm landscape:max-w-xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl transition-all duration-300">
        
        {/* Badge d'état */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">
            Direct soirée
          </span>
        </div>

        {/* Titre & Description */}
        <div className="text-center space-y-1.5 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            {event?.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Capture l'instant : ta photo apparaît directement sur le grand écran.
          </p>
        </div>

        {/* Notifications */}
        {uploadSuccess && (
          <div className="mb-5 w-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-medium p-3 rounded-2xl backdrop-blur-xl shadow-lg flex items-center justify-center gap-2 animate-bounce">
            <span>✨</span>
            <span>Photo projetée sur l'écran !</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 w-full bg-red-950/80 border border-red-500/40 text-red-200 text-xs p-3 rounded-2xl backdrop-blur-xl shadow-lg flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Déclencheur Photo unifié */}
        <label
          className={`group w-full flex flex-col landscape:flex-row items-center justify-center gap-4 landscape:gap-6 p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.05] active:scale-[0.98] transition-all duration-200 cursor-pointer ${
            uploading ? 'pointer-events-none opacity-80' : ''
          }`}
        >
          {/* Cercle avec icône appareil photo */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 p-1 flex items-center justify-center bg-black/40">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '📸'
                )}
              </div>
            </div>
          </div>

          {/* Intitulé du bouton */}
          <div className="text-center landscape:text-left">
            <p className="font-bold text-base sm:text-lg text-white group-hover:text-purple-300 transition-colors leading-snug">
              {uploading ? 'Envoi en cours...' : 'Prendre une photo'}
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

        {/* Footer intégré à la carte */}
        <p className="text-[10px] text-slate-500 font-medium mt-6">
          Propulsé par <span className="text-slate-400 font-semibold tracking-wide">KlicEvent</span>
        </p>
      </div>
    </main>
  );
}