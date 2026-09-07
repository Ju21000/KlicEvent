'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    setLoading(true);

    const slug =
      eventTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title: eventTitle,
          slug: slug,
          user_id: session ? session.user.id : null,
          plan_type: 'demo',
          payment_status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création :', error);
      alert("Impossible de créer l'événement.");
      setLoading(false);
      return;
    }

    router.push(`/create-event?eventId=${data.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      {/* En-tête avec Connexion Organisateur */}
      <div className="max-w-6xl w-full mx-auto flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            KlicEvent 📸
          </span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl border border-slate-800 transition"
        >
          Connexion Organisateur
        </Link>
      </div>

      {/* Contenu principal */}
      <div className="max-w-2xl mx-auto text-center space-y-8 z-10 my-auto py-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Capture, partage, diffuse. Ton espace photo instantané pour tous tes événements en un clin d'œil.
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto font-normal">
            Transforme le smartphone de chaque invité en photomaton instantané. Des souvenirs partagés et affichés en direct sur grand écran, sans application à télécharger.
          </p>
        </div>

        {/* Formulaire de création rapide */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl text-left space-y-4">
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2">
                Nom de l'événement
              </label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Ex: Mariage de Julie & Thomas"
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Création en cours...' : 'Créer mon événement 🚀'}
            </button>
          </form>
        </div>
      </div>

      {/* Pied de page */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-600 z-10">
        © {new Date().getFullYear()} KlicEvent. Tous droits réservés.
      </div>
    </main>
  );
}