import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-purple-400">
          KlicEvent 📸
        </h1>
        <p className="text-slate-300 text-lg">
          La plateforme de gestion de photos pour vos événements.
        </p>
        <div>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/25"
          >
            Créer un événement
          </Link>
        </div>
      </div>
    </main>
  );
}