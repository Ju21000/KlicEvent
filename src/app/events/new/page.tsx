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
  const [planType, setPlanType] = useState('demo');
  const [loading, setLoading] = useState(false);

  // Tarifs et quotas selon la formule
  const planDetails = {
    demo: { max: 20, price: 0 },
    standard: { max: 100, price: 15 },
    pro: { max: 500, price: 35 },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Génération d'un slug unique basé sur le titre
      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      const currentPlan = planDetails[planType as keyof typeof planDetails];

      // 2. Insertion dans Supabase avec l'e-mail de l'organisateur (client_email)
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
            payment_status: currentPlan.price === 0 ? 'paid' : 'pending',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 3. Envoi de l'e-mail de confirmation via l'API Resend
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          eventTitle: data.title,
          eventSlug: data.slug,
        }),
      });

      // 4. Redirection vers la galerie de l'événement
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
            href="/events"
            className="text-sm text-purple-400 hover:underline flex items-center gap-1"
          >
            ← Retour aux événements
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
            <p className="text-xs text-slate-500 mt-1">Vous recevrez le lien de votre galerie à cette adresse.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Formule</label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="demo">Formule Démo (20 photos max - Gratuit)</option>
              <option value="standard">Formule Standard (100 photos - 15€)</option>
              <option value="pro">Formule Pro (500 photos - 35€)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Création en cours..." : "Créer l'événement & recevoir l'e-mail"}
          </button>
        </form>
      </div>
    </main>
  );
}