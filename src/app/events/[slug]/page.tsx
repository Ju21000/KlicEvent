'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [event, setEvent] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    async function fetchEventAndPhotos() {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError || !eventData) {
        router.push('/');
        return;
      }

      setEvent(eventData);

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (photosData) {
        setPhotos(photosData);
      }

      setLoading(false);

      channel = supabase
        .channel(`public:photos:event_id=eq.${eventData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'photos',
            filter: `event_id=eq.${eventData.id}`,
          },
          (payload: { new: any }) => {
            setPhotos((prevPhotos) => [payload.new, ...prevPhotos]);
          }
        )
        .subscribe();
    }

    fetchEventAndPhotos();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [slug, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !event) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${event.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filePath, file);

      if (!uploadError) {
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
    }

    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Chargement de l'événement...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Galerie Live KlicEvent</span>
            <h1 className="text-3xl font-bold mt-1">{event.title}</h1>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="flex-1 md:flex-none text-center px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-lg cursor-pointer">
              {uploading ? 'Envoi en cours...' : '📸 Ajouter des photos'}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <Link
              href="/dashboard"
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition border border-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <p className="text-xl text-slate-400 font-medium">Aucune photo pour le moment.</p>
            <p className="text-sm text-slate-500">Sois le premier à immortaliser un moment de cet événement !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group"
              >
                <img
                  src={photo.url}
                  alt="Photo de l'événement"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}