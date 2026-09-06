'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  slug: string;
  date: string;
  price: number;
}

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [payingEventId, setPayingEventId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (err: any) {
        console.error("Erreur lors de la récupération des événements :", err);
        setErrorMessage("Impossible de charger les événements.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const handleCheckout = async (event: Event) => {
    try {
      setPayingEventId(event.id);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          price: event.price,
          eventId: event.id,
          slug: event.slug,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // Redirection vers Stripe Checkout
      } else {
        throw new Error(data.error || "Erreur lors de la création de la session de paiement.");
      }
    } catch (err: any) {
      console.error("Erreur de paiement :", err);
      alert("Impossible de lancer le paiement : " + err.message);
      setPayingEventId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-400">
            Mes Événements 📸
          </h1>
          <Link
            href="/create-event"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition duration-200"
          >
            + Nouvel événement
          </Link>
        </div>

        {loading && (
          <p className="text-center text-slate-400 py-12">Chargement des événements...</p>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-950 border border-rose-800 text-rose-200 rounded-lg text-sm text-center">
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && events.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-slate-400 mb-4">Aucun événement créé pour le moment.</p>
            <Link
              href="/create-event"
              className="text-purple-400 hover:underline font-medium"
            >
              Créer votre premier événement
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-semibold mb-2 text-white">
                  {event.title}
                </h2>
                <p className="text-slate-400 text-sm mb-1">
                  📅 Date : {event.date}
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  💳 Tarif d'accès : <span className="text-emerald-400 font-semibold">{event.price} €</span>
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500 font-mono">
                  slug: {event.slug}
                </span>
                <button
                  onClick={() => handleCheckout(event)}
                  disabled={payingEventId === event.id}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {payingEventId === event.id ? "Redirection..." : "Payer & voir la galerie →"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}