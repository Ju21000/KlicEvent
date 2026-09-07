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
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* En-tête */}
      <header className="max-w-6xl w-full mx-auto flex justify-between items-center p-6 md:px-12 md:py-8 z-10">
        <span className="text-xl font-black tracking-wider bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          KlicEvent 📸
        </span>
        <Link
          href="/login"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs md:text-sm font-medium rounded-xl border border-slate-800 transition"
        >
          Connexion Organisateur
        </Link>
      </header>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto text-center px-6 py-12 md:py-16 space-y-8 z-10">
        <div className="space-y-4">
          <span className="inline-block text-xs uppercase tracking-widest text-purple-400 font-semibold bg-purple-500/10 px-3.5 py-1.5 rounded-full border border-purple-500/20">
            Photobooth live instantané
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Vos photos d’événement en direct sur grand écran.
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto font-normal">
            Les invités scannent le QR code, prennent une photo et elle s’affiche immédiatement. Zéro application à installer.
          </p>
        </div>

        {/* Bloc d'action rapide */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-2xl text-left max-w-xl mx-auto">
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2">
                Nom de l’événement
              </label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Ex : Mariage de Sarah & Julien"
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? 'Création en cours...' : 'Lancer mon événement 🚀'}
            </button>
          </form>
        </div>
      </section>

      {/* 3 Étapes */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-900 w-full">
        <h2 className="text-xs uppercase tracking-widest text-purple-400 font-semibold text-center mb-3">
          Prise en main express
        </h2>
        <p className="text-2xl md:text-3xl font-bold text-center mb-12">
          Comment ça marche ?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-base">Créez l’espace</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Donnez un titre, réglez l'accès et obtenez instantanément le QR code prêt à être imprimé ou projeté.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-base">Les invités shootent</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Un scan direct avec l’appareil photo du téléphone ouvre la page d’envoi sans création de compte.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-base">Diffusion en direct</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Le diaporama plein écran fait défiler les clichés en direct. L’organisateur garde la main pour modérer.
            </p>
          </div>
        </div>
      </section>

      {/* Forfait unique */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/30 p-8 md:p-12 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold">
              Tarification simple
            </span>
            <h2 className="text-3xl font-extrabold">Un seul forfait, tout inclus</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Pas d’abonnement récurrent ni de frais cachés. Valable pour toute la durée de votre fête.
            </p>
          </div>

          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black">29 €</span>
            <span className="text-slate-400 text-sm font-medium">/ événement</span>
          </div>

          <ul className="text-sm text-slate-300 space-y-2 max-w-sm mx-auto text-left py-2">
            <li className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Jusqu'à 300 photos en haute définition
            </li>
            <li className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Nombre d’invités illimité
            </li>
            <li className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Diaporama TV / Vidéoprojecteur en direct
            </li>
            <li className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Espace de modération en temps réel
            </li>
            <li className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Téléchargement complet après la fête
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-900 w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Questions fréquentes</h2>
          <p className="text-slate-400 text-sm">Tout ce qu’il faut savoir avant de vous lancer.</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
            <h3 className="font-semibold text-sm md:text-base text-white">
              Les invités doivent-ils installer une application ?
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-2 leading-relaxed">
              Non. Il suffit de scanner le QR code avec l’appareil photo d’un smartphone (iPhone ou Android) pour ouvrir l'interface de prise de vue dans le navigateur web.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
            <h3 className="font-semibold text-sm md:text-base text-white">
              Peut-on supprimer une photo ratée ou déplacée ?
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-2 leading-relaxed">
              Oui. L’organisateur dispose d’une galerie de contrôle sur son smartphone ou PC pour effacer n’importe quelle photo en un clic. Elle disparaît instantanément du grand écran.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl">
            <h3 className="font-semibold text-sm md:text-base text-white">
              Comment projeter le diaporama dans la salle ?
            </h3>
            <p className="text-xs md:text-sm text-slate-400 mt-2 leading-relaxed">
              Connectez un ordinateur au vidéoprojecteur ou à la TV de la salle, ouvrez le lien du Live en plein écran, et laissez la magie opérer en direct sans toucher aux commandes.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-600 p-8 border-t border-slate-900 z-10 space-y-2">
        <p>© {new Date().getFullYear()} KlicEvent — Photobooth instantané et diaporama en direct.</p>
      </footer>
    </main>
  );
}