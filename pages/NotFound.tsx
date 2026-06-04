import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-smoke px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-gold-dark">404</p>
        <h1 className="mt-3 text-4xl font-display text-navy">Page introuvable</h1>
        <p className="mt-3 text-gray-600">La page demandee n'existe pas ou a ete deplacee.</p>
        <Link href="/" className="inline-flex mt-6 px-5 py-3 rounded-lg bg-navy text-white font-semibold">
          Retour a l'accueil
        </Link>
      </div>
    </main>
  );
}
