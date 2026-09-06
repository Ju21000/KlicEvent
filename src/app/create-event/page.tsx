'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Définition des formules disponibles
const PLANS = [
  { id: 'demo', name: 'Formule Démo (Gratuite)', maxPhotos: 20, price: 0 },
  { id: '100', name: 'Formule 100 photos', maxPhotos: 100, price: 15 },
  { id: '200', name: 'Formule 200 photos', maxPhotos: 200, price: 25 },
  { id: '500', name: 'Formule 500 photos', maxPhotos: 500, price: 40 },
];

export default function CreateEventPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0].id);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const slug = generateSlug(title) + '-' + Math.random().toString(36).substring(2, 7);
      
      // Trouver la formule sélectionnée pour récupérer son max_photos et son prix
      const currentPlan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];

      const { error } = await supabase
        .from('events')
        .insert([
          {
            title,
            slug,
            date,
            plan_type: currentPlan.id,
            max_photos: currentPlan.maxPhotos,
            price: currentPlan.price,
          },
        ]);

      if (error) throw error;

      setSuccessMessage('Événement créé avec succès ! 🎉');
      setTitle('');
      setDate('');
      setSelectedPlan(PLANS[0].id);
    } catch (err: any) {
      console.error("Erreur lors de la création :", err);
      setErrorMessage("Erreur Supabase : " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800">
        <h1 className="text-2xl font-bold mb-6 text-purple-400 text-center">
          Créer un événement 📸
        </h1>

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-lg text-sm text-center">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-950 border border-rose-800 text-rose-200 rounded-lg text-sm text-center break-words">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Titre de l'événement
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mariage de Julie & Thomas"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-purple-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date de l'événement
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-purple-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Choisir la formule
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-purple-500 text-white"
            >
              {PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.price}€ - max {plan.maxPhotos} photos)
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Création en cours..." : "Créer l'événement"}
          </button>
        </form>
      </div>
    </main>
  );
}