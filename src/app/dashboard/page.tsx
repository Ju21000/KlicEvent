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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/';
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
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
            <Link href="/create-event" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold">
              + Nouvel événement
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-950/50 hover:bg-red-900/50 text-red-300 rounded-xl text-sm border border-red-900/50 cursor-pointer">
              Déconnexion
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Chargement...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-slate-400 mb-4">Aucun événement pour le moment.</p>
            <Link href="/create-event" className="px-6 py-3 bg-purple-600 rounded-xl font-semibold">Créer mon premier événement</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt: any) => {
              const eventUrl = `https://www.KlicEvent.com/events/${evt.slug}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(eventUrl)}`;

              return (
                <div key={evt.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-bold">{evt.title}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">Actif</span>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <img src={qrCodeUrl} alt="QR" className="w-16 h-16 bg-white p-1 rounded-lg" />
                    <div className="text-xs space-y-1">
                      <p className="text-purple-400 font-semibold">QR Code Invités</p>
                      <a href={qrCodeUrl} download={`qr-${evt.slug}.png`} target="_blank" className="text-purple-300 underline">Télécharger</a>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <Link href={`/events/${evt.slug}`} className="flex-1 text-center py-2 bg-slate-800 text-xs rounded-lg">Voir</Link>
                    <Link href={`/events/${evt.slug}/live`} className="flex-1 text-center py-2 bg-purple-600/20 text-purple-300 text-xs rounded-lg border border-purple-800/50">Live 📺</Link>
                    <button onClick={() => handleDeleteEvent(evt.id)} className="px-3 py-2 bg-red-950/40 text-red-400 text-xs rounded-lg border border-red-900/50">🗑️</button>
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