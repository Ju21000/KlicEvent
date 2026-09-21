'use client';

import { useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function UploadContent() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get('event');

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedCount(e.target.files.length);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventParam) return;

    setUploading(true);
    setError('');

    const files = fileInputRef.current?.files;

    if (!files || files.length === 0) {
      setUploading(false);
      return;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${eventParam}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // 1. Upload dans le bucket Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, file);

        if (storageError) {
          console.error("Erreur Storage :", storageError);
          throw storageError;
        }

        // 2. Récupération de l'URL publique
        const { data: publicUrlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(fileName);

        const photoUrl = publicUrlData.publicUrl;

        // 3. Enregistrement en base de données
        const { error: dbError } = await supabase
          .from('photos')
          .insert([{ event_slug: eventParam, url: photoUrl }]);

        if (dbError) {
          console.error("Erreur DB Insert :", dbError);
          throw new Error(`Erreur Base de données : ${dbError.message}`);
        }
      }

      setSuccess(true);
      setSelectedCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléversement des photos.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-400">Ajouter des photos 📸</h1>
        {eventParam && (
          <Link href={`/events/${eventParam}`} className="text-xs text-slate-400 hover:text-white">
            ← Retour
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success ? (
        <div className="bg-green-500/10 border border-green-500 text-green-400 p-4 rounded-xl text-center space-y-3">
          <p className="font-semibold">Photos envoyées avec succès ! 🎉</p>
          <button
            onClick={() => setSuccess(false)}
            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 cursor-pointer transition"
          >
            Ajouter d'autres photos
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-4">
          {eventParam ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300">
              Événement cible : <span className="text-purple-400 font-semibold">#{eventParam}</span>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
              Aucun événement sélectionné. Veuillez passer par le lien de votre galerie.
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              id="photos"
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading || !eventParam}
            />

            <label
              htmlFor="photos"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-950 rounded-xl cursor-pointer transition group text-center"
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-200">
                Prendre une photo ou choisir dans la galerie
              </span>
              <span className="text-xs text-slate-500 mt-1">
                {selectedCount > 0
                  ? `${selectedCount} photo${selectedCount > 1 ? 's sélectionnées' : ' sélectionnée'}`
                  : 'Formats photos uniquement (JPEG, PNG, HEIC)'}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={uploading || !eventParam || selectedCount === 0}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 disabled:text-slate-400 text-white font-medium rounded-lg transition duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/25 flex items-center justify-center"
          >
            {uploading ? 'Téléversement en cours...' : 'Envoyer les photos'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <Suspense fallback={<p className="text-purple-400 animate-pulse">Chargement...</p>}>
        <UploadContent />
      </Suspense>
    </main>
  );
}