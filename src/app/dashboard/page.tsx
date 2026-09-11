'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId');

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>('Vérification...');

  // État pour la modale de suppression de compte
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (!isMounted) return;
        setUser(session.user);
        setAuthStatus(`Connecté en tant que : ${session.user.email}`);

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          setEvents(data);
        }
      } else if (eventIdFromUrl) {
        if (!isMounted) return;
        setAuthStatus('Accès invité via session d’achat');

        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventIdFromUrl)
          .single();

        if (!error && data && isMounted) {
          setEvents([data]);
        }
      } else {
        if (!isMounted) return;
        setAuthStatus('Aucune session active détectée.');
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadDashboardData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthStatus(`Connecté en tant que : ${session.user.email}`);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [eventIdFromUrl]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (!error) {
      setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmInput.trim().toUpperCase() !== 'SUPPRIMER') {
      setDeleteError('Veuillez taper "SUPPRIMER" en toutes lettres.');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Reconnectez-vous.');
      }

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression.');
      }

      // Déconnexion et redirection vers l'accueil
      await supabase.auth.signOut();
      alert('Votre compte et l’ensemble de vos données ont été définitivement supprimés.');
      window.location.href = '/';
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Une erreur est survenue.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête statut */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center text-xs">
          <span className="text-purple-400 font-medium">Statut auth : {authStatus}</span>
          {user && (
            <button onClick={handleLogout} className="text-red-400 hover:underline cursor-pointer">
              Se déconnecter
            </button>
          )}
        </div>

        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold">Tableau de bord</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/create-event"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition"
            >
              + Nouvel événement
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Chargement de vos événements...</p>
        ) : !user && !eventIdFromUrl ? (
          <div className="text-center py-12 bg-red-950/20 border border-red-900/50 rounded-2xl space-y-4">
            <p className="text-red-300 font-semibold">Tu n'es pas connecté.</p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700"
            >
              Se connecter
            </Link>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
            <p className="text-slate-400">Aucun événement pour le moment.</p>
            <Link
              href="/create-event"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold"
            >
              Créer mon premier événement 🚀
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt: any) => {
              const eventUrl = `https://www.klicevent.com/events/${evt.slug}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                eventUrl
              )}`;

              return (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold">{evt.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Date : {evt.date || 'Non définie'}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                      Actif
                    </span>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 object-contain" />
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="text-purple-400 font-semibold">QR Code Invités</p>
                      <p className="text-slate-400 truncate max-w-[170px]">
                        www.klicevent.com/events/{evt.slug}
                      </p>
                      <a
                        href={qrCodeUrl}
                        download={`qr-${evt.slug}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-purple-300 hover:underline font-medium mt-1"
                      >
                        Télécharger 📥
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <Link
                      href={`/events/${evt.slug}/admin`}
                      className="flex-1 text-center py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      Voir
                    </Link>
                    <Link
                      href={`/events/${evt.slug}/slideshow`}
                      className="flex-1 text-center py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold rounded-lg border border-purple-800/50 transition"
                    >
                      Live 📺
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs rounded-lg border border-red-900/50 transition cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Zone de Danger : Suppression du compte */}
        {user && (
          <div className="pt-10 border-t border-slate-800/80">
            <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-red-400">Zone de danger</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                  La suppression de votre compte efface définitivement tous vos événements, QR codes et photos associées stockées dans nos bases. Cette action est irréversible.
                </p>
              </div>
              <button
                onClick={() => {
                  setConfirmInput('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer"
              >
                Supprimer mon compte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">Supprimer définitivement votre compte ?</h2>
              <p className="text-xs text-amber-300/90 font-medium bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                📸 <strong>Attention :</strong> pensez à bien télécharger toutes les photos de vos événements avant de confirmer. Une fois le compte supprimé, aucun souvenir ne pourra être restauré.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block text-center">
                Pour confirmer, tapez le mot <strong className="text-white">SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-sm font-semibold text-white focus:outline-none focus:border-red-500 uppercase tracking-wider"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-red-400 text-center font-medium">{deleteError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || confirmInput.trim().toUpperCase() !== 'SUPPRIMER'}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <p className="text-slate-500 text-sm">Chargement du tableau de bord...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}