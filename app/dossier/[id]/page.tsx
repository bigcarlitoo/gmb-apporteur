
import { Suspense } from 'react';
import DossierDetailContent from './DossierDetailContent';
import { createClient } from '@supabase/supabase-js';

// FONCTION REQUISE POUR L'EXPORT STATIQUE
export async function generateStaticParams() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('dossiers')
      .select('id')
      .limit(500);

    if (error || !data) return [];
    return data.map((d: { id: string }) => ({ id: d.id }));
  } catch (_e) {
    return [];
  }
}

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dossier...</p>
        </div>
      </div>
    }>
      <DossierDetailContent dossierId={id} />
    </Suspense>
  );
}
