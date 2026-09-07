'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    }
    checkUser();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const slug = Math.random().toString(36).substring(2, 10);

    const userId = user ? user.id : null;
    const userEmail = user ? user.email : 'anonyme@klic-event.com';

    // Insertion de l'événement avec liaison utilisateur
    const { error } = await supabase.from('events').insert([
      {
        slug: slug,
        title: title,
        client_email: userEmail,
        user_id: userId,
        plan_type: 'demo',
        is_paid: false
      }
    ]);

    setLoading(false);

    if (error) {
      console.error("Erreur création :", error);
      alert("Erreur lors de la création de l'événement.");
    } else {
      // Envoi de l'e-mail récapitulatif en arrière-plan
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          title: title,
          slug: slug,
        }),
      }).catch((err) => console.error("Erreur d'envoi d'email :", err));

      router.push(`/events/${slug}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 right-6">
        {user ? (
          <Link href="/dashboard" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm font-medium rounded-lg transition shadow-lg">
            Mon Dashboard →
          </Link>
        ) : (
          <Link href="/login" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-lg transition border border-slate-700">
            Connexion Organisateur
          </Link>
        )}
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6 text-center">
        <h1 className="text-3xl font-bold text-purple-400">KlicEvent 📸</h1>
        <p className="text-slate-400 text-sm">Crée ton espace photo instantané pour ton événement en un clin d'œil.</p>

        <form onSubmit={handleCreateEvent} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom de l'événement</label>
            <input
              type="text"
              required
              placeholder="Ex: Mariage de Julie & Thomas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 text-white font-medium rounded-lg transition duration-200 shadow-lg cursor-pointer"
          >
            {loading ? 'Création en cours...' : 'Créer mon événement 🚀'}
          </button>
        </form>
      </div>
    </main>
  );
}