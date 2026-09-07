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
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Récupérer les événements de l'utilisateur connecté
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setEvents(data);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* En-tête du Dashboard */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Mon Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm font-medium rounded-lg transition shadow-lg"
            >
              + Créer un événement
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition border border-slate-700 cursor-pointer"
            >
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Liste des événements */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Mes Événements</h2>

          {events.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <p className="text-slate-400 font-medium">Aucun événement créé pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white">{evt.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Slug : {evt.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href={`/events/${evt.slug}`}
                      className="flex-1 text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-lg"
                    >
                      Voir la galerie
                    </Link>
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