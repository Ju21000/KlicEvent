'use client';

import { use } from 'react';
import Link from 'next/link';

export default function EventGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* En-tête de la galerie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              Galerie Événement
            </span>
            <h1 className="text-3xl font-bold mt-2">Événement #{slug}</h1>
            <p className="text-slate-400 text-sm mt-1">Partagez et téléchargez les photos de la soirée !</p>
          </div>
          <Link
            href="/upload"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition duration-200 shadow-lg hover:shadow-purple-500/25 text-center"
          >
            Déposer des photos 📸
          </Link>
        </div>

        {/* Grille de photos (Vide pour l'instant) */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto text-2xl">
            🖼️
          </div>
          <h2 className="text-xl font-semibold text-slate-300">Aucune photo pour le moment</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Sois le premier à immortaliser ce moment en téléversant tes clichés depuis ton téléphone !
          </p>
          <Link
            href="/upload"
            className="inline-block mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition duration-200"
          >
            Ajouter des photos
          </Link>
        </div>
      </div>
    </main>
  );
}