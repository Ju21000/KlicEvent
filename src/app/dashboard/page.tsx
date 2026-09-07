'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      // On utilise getUser() qui interroge directement le serveur/session de manière plus robuste
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        window.location.href = '/';
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (!error) {
      setEvents(events.filter((evt: any) => evt.id !== eventId));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold">Tableau de bord</h1>
          <div className="flex items-center gap-3">
            <Link href="/create-event" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition">
              + Nouvel événement
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-950/50 hover:bg-red-900/50 text-red-300 rounded-xl text-sm border border-red-900/50 cursor-pointer transition">
              Déconnexion
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Chargement de vos événements...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
            <p className="text-slate-400">Aucun événement pour le moment.</p>
            <Link href="/create-event" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition">Créer mon premier événement 🚀</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt: any) => {
              const eventUrl = `https://www.KlicEvent.com/events/${evt.slug}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(eventUrl)}`;

              return (
                <div key={evt.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold">{evt.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Date : {evt.date || 'Non définie'}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">Actif</span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-purple-400 font-semibold">QR Code Invités</p>
                      <p className="text-slate-400 truncate max-w-[170px]">www.KlicEvent.com/events/{evt.slug}</p>
                      <a href={qrCodeUrl} download={`qr-${evt.slug}.png`} target="_blank" rel="noopener noreferrer" className="inline-block text-purple-300 hover:underline font-medium mt-1">Télécharger 📥</a>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <Link href={`/events/${evt.slug}`} className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition">Voir</Link>
                    <Link href={`/events/${evt.slug}/live`} className="flex-1 text-center py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/50 transition">Live 📺</Link>
                    <button onClick={() => handleDeleteEvent(evt.id)} className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs rounded-lg border border-red-900/50 transition cursor-pointer">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}