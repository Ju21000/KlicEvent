'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUserAndFetchEvents() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id) // Filtrage strict par l'ID utilisateur connecté
        .order('created_at', { ascending: false });

      if (eventsData) {
        setEvents(eventsData);
      }

      setLoading(false);
    }

    checkUserAndFetchEvents();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement l'événement "${eventTitle}" et toutes ses photos ?`)) {
      return;
    }

    try {
      // 1. Supprimer les photos du stockage Supabase
      const { data: photosData } = await supabase
        .from('photos')
        .select('url')
        .eq('event_id', eventId);

      if (photosData && photosData.length > 0) {
        for (const photo of photosData) {
          const urlParts = photo.url.split('/event-photos/');
          if (urlParts.length > 1) {
            await supabase.storage.from('event-photos').remove([urlParts[1]]);
          }
        }
      }

      // 2. Supprimer les lignes de la table photos
      await supabase.from('photos').delete().eq('event_id', eventId);

      // 3. Supprimer l'événement de la table events de façon stricte par son ID
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // 4. Mettre à jour l'état local immédiatement
      setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'événement :", err);
      alert("Impossible de supprimer l'événement.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Chargement du dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Mon Compte Organisateur</span>
            <h1 className="text-3xl font-bold mt-1">Tableau de bord</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.email}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <Link
              href="/create-event"
              className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg transition cursor-pointer"
            >
              + Créer un événement
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition border border-slate-700 cursor-pointer"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Mes Événements ({events.length})</h2>

          {events.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-16 text-center space-y-4">
              <p className="text-xl text-slate-400 font-medium">Aucun événement créé pour le moment.</p>
              <p className="text-sm text-slate-500">Lancez votre premier espace photo instantané dès maintenant !</p>
              <div>
                <Link
                  href="/create-event"
                  className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition shadow-lg"
                >
                  Créer mon premier événement
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs uppercase px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800/50 rounded-lg font-semibold">
                        {evt.plan_type === 'standard' ? 'Standard (300 photos)' : 'Démo (20 photos)'}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${evt.payment_status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                        {evt.payment_status === 'paid' ? 'Payé / Actif' : 'En attente'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-2">{evt.title}</h3>
                    <p className="text-xs text-slate-400">Date : {evt.date}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      href={`/events/${evt.slug}`}
                      className="text-sm text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
                    >
                      Voir la galerie →
                    </Link>

                    <button
                      onClick={() => handleDeleteEvent(evt.id, evt.title)}
                      className="text-xs px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/50 rounded-lg transition cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}