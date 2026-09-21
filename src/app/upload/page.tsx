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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Gestion de la sélection (cumule ou remplace les fichiers choisis)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!eventParam || selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
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

        // 3. Insertion en base de données
        const { error: dbError } = await supabase
          .from('photos')
          .insert([{ event_slug: eventParam, url: photoUrl }]);

        if (dbError) {
          console.error("Erreur DB Insert :", dbError);
          throw new Error(`Erreur Base de données : ${dbError.message}`);
        }
      }

      setSuccess(true);
      setSelectedFiles([]);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
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
        <form onSubmit={handleUpload} className="space-y-5">
          {eventParam ? (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300">
              Événement cible : <span className="text-purple-400 font-semibold">#{eventParam}</span>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
              Aucun événement sélectionné. Veuillez passer par le lien de votre galerie.
            </div>
          )}

          {/* Deux inputs invisibles spécialisés */}
          <input
            ref={cameraInputRef}
            id="camera-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || !eventParam}
          />
          <input
            ref={galleryInputRef}
            id="gallery-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || !eventParam}
          />

          {/* Les 2 boutons d'action mobile */}
          <div className="grid grid-cols-2 gap-3">
            <label
              htmlFor="camera-upload"
              className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 hover:border-purple-500 rounded-xl cursor-pointer transition text-center group active:scale-95"
            >
              <div className="w-10 h-10 mb-2 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-200">Appareil photo</span>
            </label>

            <label
              htmlFor="gallery-upload"
              className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 hover:border-purple-500 rounded-xl cursor-pointer transition text-center group active:scale-95"
            >
              <div className="w-10 h-10 mb-2 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-200">Galerie photos</span>
            </label>
          </div>

          {/* Récapitulatif visuel */}
          {selectedFiles.length > 0 && (
            <div className="flex justify-between items-center bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg text-xs">
              <span className="text-purple-300 font-medium">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? 's prêtes' : ' prête'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="text-slate-500 hover:text-red-400 transition cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !eventParam || selectedFiles.length === 0}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 disabled:text-slate-400 text-white font-medium rounded-lg transition duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/25 flex items-center justify-center"
          >
            {uploading ? 'Téléversement en cours...' : `Envoyer ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
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