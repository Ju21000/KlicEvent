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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        window.location.href = '/';
        return;
      }

      setUser(user);

      // Récupération des événements strictement filtrés par l'ID de l'utilisateur connecté
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération des événements :", error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchUserDataAndEvents();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Redirection nette avec rechargement complet
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
      setEvents(events.filter((evt: any) => evt.id !== eventId));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* En-tête du Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Tableau de bord</h1>
            <p className="text-slate-400 text-sm mt-1">Gère tes événements, accède aux diaporamas et récupère tes QR codes.</p>
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
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-950/50 hover:bg-red-900/50 text-red-300 text-sm font-medium rounded-xl border border-red-900/50 transition cursor-pointer"
            >
              Déconnexion
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt: any) => {
              const eventUrl = `https://www.KlicEvent.com/events/${evt.slug}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(eventUrl)}`;

              return (
                <div 
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-slate-700 transition relative flex flex-col justify-between shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-bold text-white">{evt.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Date : {evt.date || 'Non définie'}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evt.payment_status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {evt.payment_status === 'paid' ? 'Actif / Payé' : 'Démo / En attente'}
                      </span>
                    </div>

                    {/* Bloc QR Code */}
                    <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="bg-white p-2 rounded-lg shrink-0">
                        <img src={qrCodeUrl} alt={`QR Code pour ${evt.title}`} className="w-20 h-20 object-contain" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-purple-400 font-semibold">QR Code invités</p>
                        <p className="text-slate-400 truncate max-w-[180px]">www.KlicEvent.com/events/{evt.slug}</p>
                        <a 
                          href={qrCodeUrl} 
                          download={`qrcode-${evt.slug}.png`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-purple-300 hover:underline font-medium mt-1"
                        >
                          Télécharger le QR 📥
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                    <Link
                      href={`/events/${evt.slug}`}
                      className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                    >
                      Voir
                    </Link>
                    <Link
                      href={`/events/${evt.slug}/live`}
                      className="flex-1 text-center py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/50 transition"
                    >
                      Live 📺
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-lg border border-red-900/50 transition cursor-pointer"
                    >
                      🗑️
                    </button>
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