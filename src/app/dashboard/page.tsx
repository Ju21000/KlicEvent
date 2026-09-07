'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserDataAndEvents = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Optionnel : rediriger vers une page de login ou laisser public avec les événements liés au cookie/local
        setUser(null);
      } else {
        setUser(session.user);
      }

      // Récupérer les événements depuis Supabase
      let query = supabase.from('events').select('*').order('created_at', { ascending: false });
      
      if (session) {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erreur lors de la récupération des événements :", error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchUserDataAndEvents();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* En-tête du Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Tableau de bord</h1>
            <p className="text-slate-400 text-sm mt-1">Gère tes événements et accède aux diaporamas live.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl border border-slate-800 transition"
            >
              Accueil
            </Link>
            <Link
              href="/create-event"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg transition"
            >
              + Nouvel événement
            </Link>
          </div>
        </div>

        {/* Liste des événements */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Chargement de vos événements...</div>
        ) : events.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <p className="text-slate-400">Aucun événement trouvé pour le moment.</p>
            <Link
              href="/create-event"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition"
            >
              Créer mon premier événement 🚀
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div 
                key={evt.id}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-white">{evt.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Date : {evt.date || 'Non définie'}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evt.payment_status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                    {evt.payment_status === 'paid' ? 'Actif / Payé' : 'Démo / En attente'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <Link
                    href={`/events/${evt.slug}`}
                    className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                  >
                    Voir l'espace photo
                  </Link>
                  <Link
                    href={`/events/${evt.slug}/live`}
                    className="flex-1 text-center py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/50 transition"
                  >
                    Diaporama Live 📺
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/');
};

const handleDeleteEvent = async (eventId: string) => {
  if (!confirm("Es-tu sûr de vouloir supprimer cet événement ?")) return;

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error("Erreur lors de la suppression :", error);
    alert("Impossible de supprimer l'événement.");
  } else {
    // Met à jour la liste locale des événements affichés
    setEvents(events.filter(evt => evt.id !== eventId));
  }
};