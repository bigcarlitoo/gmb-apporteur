
import { Suspense } from 'react';
import { DossiersService } from '@/lib/services/dossiers';
import AdminDossierDetailContent from './AdminDossierDetailContent';

// Page export statique: pas de rendu dynamique côté serveur

// Fallback pour output: export → on renvoie une liste vide (Next export autorise la navigation dynamique si on gère côté client)
export async function generateStaticParams() {
  try {
    const all = await DossiersService.getAllDossiers();
    // Limiter le volume pour l'export statique, sinon renvoyer une liste vide
    return (all || []).slice(0, 50).map((d: any) => ({ id: d.id }));
  } catch {
    return [] as { id: string }[];
  }
}

export default async function AdminDossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const awaited = await params;
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dossier...</p>
        </div>
      </div>
    }>
      <AdminDossierDetailContent dossierId={awaited.id} />
    </Suspense>
  );
}
