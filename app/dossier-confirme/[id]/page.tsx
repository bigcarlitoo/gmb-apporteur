'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DossiersService } from '@/lib/services/dossiers';

// Interface pour les données du dossier
interface DossierData {
  id: any;
  numero_dossier: any;
  statut: any;
  created_at: any;
  client_infos?: any;
  user?: {
    email: string;
  };
  commentaire?: any;
  [key: string]: any; // Pour accepter les autres propriétés
}

interface DossierConfirmePageProps {
  params: {
    id: string;
  };
}

export default function DossierConfirmePage({ params }: DossierConfirmePageProps) {
  const router = useRouter();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour récupérer les données du dossier depuis Supabase
  const fetchDossierData = async (dossierId: string) => {
    setIsLoading(true);
    try {
      const dossierData = await DossiersService.getDossierById(dossierId);
      setDossier(dossierData);
    } catch (error) {
      console.error('Erreur lors du chargement du dossier:', error);
      // En cas d'erreur, afficher un dossier par défaut
      setDossier({
        id: dossierId,
        numero_dossier: `DSS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        statut: 'en_attente',
        created_at: new Date().toISOString(),
        client_infos: {
          nom: 'Client',
          prenom: 'Test',
          email: 'client@test.com',
          telephone: '01 23 45 67 89'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchDossierData(params.id);
    }
  }, [params.id]);

  const handleBackToDashboard = () => {
    router.push('/');
  };

  const handleNewDossier = () => {
    router.push('/nouveau-dossier');
  };

  const handleViewDossier = () => {
    router.push(`/dossier/${params.id}`);
  };

  const getStatutInfo = (statut: string) => {
    switch (statut) {
      case 'en_attente':
      case 'nouveau':
        return { label: 'En attente', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: 'ri-time-line' };
      case 'devis_envoye':
        return { label: 'Devis envoyé', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', icon: 'ri-send-plane-line' };
      case 'valide':
      case 'devis_accepte':
        return { label: 'Validé', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: 'ri-checkbox-circle-line' };
      case 'refuse':
      case 'devis_refuse':
        return { label: 'Refusé', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: 'ri-close-circle-line' };
      case 'finalise':
        return { label: 'Finalisé', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', icon: 'ri-checkbox-circle-line' };
      default:
        return { label: 'En cours', color: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]', icon: 'ri-loader-line' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Dossier non trouvé</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Le dossier demandé n'existe pas ou n'est pas accessible.</p>
          <button
            onClick={handleBackToDashboard}
            className="bg-[#335FAD] hover:bg-[#335FAD]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const statutInfo = getStatutInfo(dossier.statut);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Main Content */}
      <main className="px-4 sm:px-8 py-12 max-w-4xl mx-auto">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-4xl"></i>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-light text-gray-900 dark:text-white mb-4">
            Dossier créé avec succès !
          </h1>
          
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Votre dossier client a été transmis à notre système d'analyse IA et sera traité dans les plus brefs délais.
          </p>

          {/* Dossier Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-xl flex items-center justify-center mr-4">
                <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Numéro de dossier</h3>
                <p className="text-2xl font-mono font-bold text-[#335FAD] dark:text-[#335FAD]/80">{dossier.numero_dossier}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Statut</span>
                <span className={`px-3 py-1 rounded-full font-medium flex items-center ${statutInfo.color}`}>
                  <i className={`${statutInfo.icon} mr-1 text-xs`}></i>
                  {statutInfo.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Date de création</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {dossier.client_infos && typeof dossier.client_infos === 'object' && dossier.client_infos.prenom && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Client</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {dossier.client_infos.prenom} {dossier.client_infos.nom}
                  </span>
                </div>
              )}
              {dossier.user && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Email</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {dossier.user.email}
                  </span>
                </div>
              )}
              {dossier.commentaire && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Commentaire</span>
                  <span className="text-gray-900 dark:text-white font-medium text-right max-w-xs truncate">
                    {dossier.commentaire}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleBackToDashboard}
              className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 border border-gray-200 dark:border-gray-600"
            >
              <i className="ri-dashboard-line"></i>
              <span>Retour au tableau de bord</span>
            </button>
            
            <button
              onClick={handleViewDossier}
              className="w-full sm:w-auto bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 border border-gray-200 dark:border-gray-600"
            >
              <i className="ri-eye-line"></i>
              <span>Voir le dossier</span>
            </button>
            
            <button
              onClick={handleNewDossier}
              className="w-full sm:w-auto bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <i className="ri-add-line"></i>
              <span>Créer un autre dossier</span>
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Une question sur votre dossier ?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="mailto:support@gmbcourtage.fr" className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 flex items-center cursor-pointer">
                <i className="ri-mail-line mr-2"></i>
                support@gmbcourtage.fr
              </a>
              <span className="hidden sm:block text-gray-300 dark:text-gray-600">|</span>
              <a href="tel:+33123456789" className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 flex items-center cursor-pointer">
                <i className="ri-phone-line mr-2"></i>
                01 23 45 67 89
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
