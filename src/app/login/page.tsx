'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        alert('Inscription réussie ! Vérifie tes e-mails ou connecte-toi.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        window.location.href = '/dashboard';
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-purple-400">
            www.KlicEvent.com
          </Link>
          <h1 className="text-2xl font-bold">
            {isSignUp ? 'Créer un espace Organisateur' : 'Espace Organisateur'}
          </h1>
          <p className="text-xs text-slate-400">Retrouve tes événements et tes diaporamas live.</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-900 text-red-300 p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder="ton@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition duration-200 shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Accéder à mon espace'}
          </button>
        </form>

        <div className="flex flex-col items-center justify-center space-y-2 text-xs pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-400 hover:underline font-medium cursor-pointer"
          >
            {isSignUp ? 'Déjà un compte ? Connecte-toi' : "Pas de compte ? Crée ton espace ici"}
          </button>
          <Link href="/" className="text-slate-500 hover:text-slate-300">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}