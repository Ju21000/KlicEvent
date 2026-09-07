'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    setUploading(true);
    setUploadSuccess(false);
    setErrorMessage('');

    try {
      // 1. Vérification du quota de photos
      const { count, error: countError } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      if (!countError && count !== null && event.max_photos && count >= event.max_photos) {
        setErrorMessage("La limite de photos pour cet événement a été atteinte !");
        setUploading(false);
        return;
      }

      // 2. Upload des fichiers
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
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      console.error("Erreur d'envoi :", err);
      setErrorMessage("Erreur lors de l'envoi de la photo. Merci de réessayer.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-slate-400">Chargement de l'événement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 max-w-md mx-auto text-center selection:bg-purple-600">
      {/* En-tête invité */}
      <header className="pt-8 space-y-2">
        <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          Photobooth Invité 📸
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight pt-2">
          {event?.title}
        </h1>
        <p className="text-xs text-slate-400">
          Partage tes souvenirs en direct sur l’écran de la soirée !
        </p>
      </header>

      {/* Zone centrale d'envoi */}
      <div className="py-12 space-y-6">
        {uploadSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-sm p-4 rounded-2xl animate-fade-in">
            Photo envoyée avec succès sur le grand écran ! 🎉
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-950/40 border border-red-800 text-red-400 text-sm p-4 rounded-2xl">
            {errorMessage}
          </div>
        )}

        <label
          className={`flex flex-col items-center justify-center gap-4 w-full aspect-square rounded-3xl border-2 border-dashed border-purple-500/50 bg-slate-900/50 hover:bg-purple-950/20 transition cursor-pointer p-8 shadow-2xl ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-900/50">
            📸
          </div>
          <div>
            <p className="font-bold text-lg text-white">
              {uploading ? 'Envoi en cours...' : 'Prendre une photo'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou choisis dans ta bibliothèque
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

      {/* Pied de page branding */}
      <footer className="pb-6 text-slate-600 text-xs">
        Propulsé par <span className="text-slate-400 font-semibold">KlicEvent.com</span>
      </footer>
    </main>
  );
}