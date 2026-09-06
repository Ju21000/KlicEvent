'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  slug: string;
}

export default function UploadPhotosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase.from('events').select('id, title, slug');
      if (data) setEvents(data);
    }
    fetchEvents();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert("Veuillez sélectionner un événement.");
      return;
    }

    const fileInput = (e.currentTarget.elements.namedItem('photos') as HTMLInputElement);
    const files = fileInput.files;
    if (!files || files.length === 0) {
      alert("Veuillez sélectionner au moins une photo.");
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${selectedEventId}/${fileName}`;

        // 1. Envoi dans le Storage Supabase
        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Récupération de l'URL publique
        const { data: publicURLData } = supabase.storage
          .from('event-photos')
          .getPublicUrl(filePath);

        // 3. Enregistrement dans la table photos
        const { error: dbError } = await supabase
          .from('photos')
          .insert([
            { event_id: selectedEventId, image_url: publicURLData.publicUrl }
          ]);

        if (dbError) throw dbError;
      }

      setMessage('✨ Photos uploadées et enregistrées avec succès !');
      fileInput.value = '';
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-purple-400">Ajouter des photos 📸</h1>
          <Link href="/events" className="text-sm text-slate-400 hover:underline">
            ← Retour
          </Link>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sélectionner l'événement
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              required
            >
              <option value="">-- Choisir un événement --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sélectionner les photos (plusieurs possibles)
            </label>
            <input
              type="file"
              name="photos"
              multiple
              accept="image/*"
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              required
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {uploading ? "Envoi en cours..." : "Uploader les photos"}
          </button>

          {message && (
            <p className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-xl text-sm text-center">
              {message}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}