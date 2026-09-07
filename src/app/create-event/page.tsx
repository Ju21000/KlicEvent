'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [email, setEmail] = useState('');
  const [planType, setPlanType] = useState('demo'); // 'demo' ou 'standard'
  const [loading, setLoading] = useState(false);

  const planDetails = {
    demo: { max: 20, price: 0 },
    standard: { max: 300, price: 29 },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session ? session.user.id : null;

      const currentPlan = planDetails[planType as keyof typeof planDetails];

      // Redirection vers Stripe si formule payante (Standard à 29€)
      if (currentPlan.price > 0) {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            date,
            email,
            formula: planType,
            userId,
          }),
        });

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        } else {
          throw new Error(data.error || "Erreur lors de la création de la session de paiement.");
        }
      }

      // Formule gratuite (démo)
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            title,
            date,
            slug,
            client_email: email,
            max_photos: currentPlan.max,
            plan_type: planType,
            price: currentPlan.price,
            payment_status: 'paid',
            user_id: userId,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          title: data.title,
          slug: data.slug,
          isPaid: false,
        }),
      });

      router.push(`/events/${data.slug}`);

    } catch (err) {
      console.error("Erreur lors de la création :", err);
      alert("Une erreur est survenue lors de la création de l'événement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-purple-400 hover:underline flex items-center gap-1"
          >
            ← Retour au dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
          <h1 className="text-2xl font-bold text-white">Créer un nouvel événement</h1>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Titre de l'événement</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mariage de Marie & Thomas"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date de l'événement</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Votre adresse e-mail (Organisateur)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@exemple.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Sélecteur de formules sous forme de cartes cliquables */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Choisissez votre formule</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => setPlanType('demo')}
                className={`cursor-pointer border rounded-xl p-4 transition ${planType === 'demo' ? 'border-purple-500 bg-purple-950/30 shadow-lg' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
              >
                <div className="font-bold text-white">Démo</div>
                <div className="text-xs text-slate-400 mt-1">20 photos max</div>
                <div className="text-purple-400 font-semibold mt-3">Gratuit</div>
              </div>

              <div 
                onClick={() => setPlanType('standard')}
                className={`cursor-pointer border rounded-xl p-4 transition ${planType === 'standard' ? 'border-purple-500 bg-purple-950/30 shadow-lg' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
              >
                <div className="font-bold text-white">Standard</div>
                <div className="text-xs text-slate-400 mt-1">300 photos</div>
                <div className="text-purple-400 font-semibold mt-3">29 €</div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Patientez..." : planType === 'standard' ? "Payer 29€ & Créer l'événement" : "Créer l'événement gratuit"}
          </button>
        </form>
      </div>
    </main>
  );
}