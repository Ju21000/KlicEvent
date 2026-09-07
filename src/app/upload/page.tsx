'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function UploadContent() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get('event');

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventParam) return;

    setUploading(true);
    setError('');

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('photos') as HTMLInputElement;
    const files = fileInput?.files;

    if (!files || files.length === 0) {
      setUploading(false);
      return;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${eventParam}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // 1. Upload du fichier dans le stockage Supabase (Bucket 'event-photos')
        const { error: storageError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, file);

        if (storageError) {
          console.error("Erreur Storage:", storageError);
          throw storageError;
        }

        // 2. Récupération de l'URL publique de l'image
        const { data: publicUrlData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(fileName);

        const photoUrl = publicUrlData.publicUrl;

        // 3. Enregistrement de l'URL dans la table de la base de données ('photos')
        const { error: dbError } = await supabase
          .from('photos')
          .insert([{ event_slug: eventParam, url: photoUrl }]);

        if (dbError) {
          console.error("Erreur DB Insert:", dbError);
          throw new Error(`Erreur Base de données : ${dbError.message}`);
        }
      }

      setSuccess(true);
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
            className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 cursor-pointer"
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
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Sélectionner vos photos (plusieurs possibles)
            </label>
            <input
              name="photos"
              type="file"
              multiple
              accept="image/*"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !eventParam}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 text-white font-medium rounded-lg transition duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/25 flex items-center justify-center"
          >
            {uploading ? 'Téléversement en cours...' : 'Uploader les photos'}
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