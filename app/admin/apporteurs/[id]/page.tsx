import { Suspense } from 'react';
import ApporteurDetailContent from './ApporteurDetailContent';
import { supabase } from '@/lib/supabase';

export async function generateStaticParams() {
  try {
    // Récupérer tous les IDs d'apporteurs depuis la DB pour la génération statique
    const { data: apporteurs, error } = await supabase
      .from('apporteur_profiles')
      .select('id');

    if (error) {
      console.error('Erreur lors de la récupération des apporteurs pour generateStaticParams:', error);
      return [];
    }

    // Retourner les IDs pour la génération des pages statiques
    return apporteurs?.map((apporteur) => ({
      id: apporteur.id
    })) || [];
  } catch (error) {
    console.error('Erreur dans generateStaticParams:', error);
    return [];
  }
}

export default async function ApporteurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    }>
      <ApporteurDetailContent apporteurId={id} />
    </Suspense>
  );
}