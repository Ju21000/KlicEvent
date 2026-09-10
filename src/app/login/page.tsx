'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const getReadableError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet e-mail.';
    if (msg.includes('Password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.';
    return msg;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(getReadableError(signUpError.message));
          return;
        }

        // Déclenche l'e-mail d'alerte vers ton adresse en arrière-plan
        fetch('/api/notify-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: email }),
        }).catch((err) => console.error('Erreur alerte inscription :', err));

        if (data.session) {
          router.push(redirectTo);
          router.refresh();
          return;
        }

        setSuccessMessage('Compte créé ! Un lien de confirmation a été envoyé sur ta boîte mail.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(getReadableError(signInError.message));
          return;
        }

        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError("Une erreur inattendue s'est produite. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-purple-400">
          KlicEvent
        </Link>
        <h1 className="text-2xl font-bold">
          {isSignUp ? 'Créer un compte' : 'Connexion organisateur'}
        </h1>
        <p className="text-xs text-slate-400">
          {isSignUp
            ? 'Prépare ton événement et active ton diaporama live.'
            : 'Accède à ton dashboard et à tes galeries.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-900 text-red-300 p-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-300 p-3 rounded-xl text-xs">
          {successMessage}
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
          {loading
            ? 'Vérification...'
            : isSignUp
            ? 'Créer mon compte'
            : 'Accéder à mon espace'}
        </button>
      </form>

      <div className="flex flex-col items-center justify-center space-y-2 text-xs pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
            setSuccessMessage('');
          }}
          className="text-purple-400 hover:underline font-medium cursor-pointer"
        >
          {isSignUp ? 'Déjà un compte ? Connecte-toi' : "Pas encore de compte ? M'inscrire"}
        </button>
        <Link href="/" className="text-slate-500 hover:text-slate-300">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <Suspense fallback={<p className="text-slate-500 text-xs">Chargement...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}