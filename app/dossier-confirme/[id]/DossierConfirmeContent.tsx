'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DossiersService } from '@/lib/services/dossiers';
import { getStatutBadgeConfig, mapStatutForDisplay } from '@/lib/utils/statut-mapping';

// Interface pour les données du dossier
interface DossierData {
  id: string;
  numero_dossier: string;
  statut: string;
  computed_statut?: string;
  created_at: string;
  type_dossier?: string;
  is_couple?: boolean;
  commentaire?: string;
  client_infos?: Array<{
    client_nom: string;
    client_prenom: string;
    client_email: string;
    client_telephone?: string;
    client_date_naissance?: string;
    conjoint_nom?: string;
    conjoint_prenom?: string;
  }>;
  pret_data?: Array<{
    montant_capital: number;
    banque_preteuse: string;
    duree_mois: number;
    type_pret: string;
  }>;
  documents?: Array<{
    id: string;
    document_name: string;
    document_type: string;
    file_size: number;
    created_at: string;
  }>;
  [key: string]: any;
}

interface DossierConfirmeContentProps {
  dossierId: string;
}

export default function DossierConfirmeContent({ dossierId }: DossierConfirmeContentProps) {
  const router = useRouter();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer les données du dossier depuis Supabase
  const fetchDossierData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const dossierData = await DossiersService.getDossierById(id);
      console.log('[DossierConfirme] Données récupérées:', dossierData);
      setDossier(dossierData);
    } catch (error) {
      console.error('[DossierConfirme] Erreur lors du chargement du dossier:', error);
      setError('Le dossier n\'a pas pu être chargé. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dossierId) {
      fetchDossierData(dossierId);
    }
  }, [dossierId]);

  const handleBackToDashboard = () => {
    router.push('/');
  };

  const handleNewDossier = () => {
    router.push('/nouveau-dossier');
  };

  const handleViewDossier = () => {
    router.push(`/dossier/${dossierId}`);
  };

  // ✅ MIGRATION COMPLÈTE - Utilisation de la source de vérité unique depuis lib/utils/statut-mapping.ts

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {error ? 'Erreur de chargement' : 'Dossier non trouvé'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error || 'Le dossier demandé n\'existe pas ou n\'est pas accessible.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchDossierData(dossierId)}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={handleBackToDashboard}
              className="bg-[#335FAD] hover:bg-[#335FAD]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Utiliser computed_statut si disponible (statut canonique), sinon fallback sur statut
  const currentStatut = dossier.computed_statut || dossier.statut || 'en_attente';
  const statutInfo = getStatutBadgeConfig(currentStatut);
  
  // Extraire les informations principales
  const clientInfo = dossier.client_infos && dossier.client_infos.length > 0 ? dossier.client_infos[0] : null;
  const pretInfo = dossier.pret_data && dossier.pret_data.length > 0 ? dossier.pret_data[0] : null;
  const hasDocuments = dossier.documents && dossier.documents.length > 0;
  const isCouple = dossier.is_couple || (clientInfo?.conjoint_nom && clientInfo?.conjoint_prenom);

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
            Votre dossier a été transmis avec succès. Nos équipes GMB Courtage l'étudient actuellement et vous contacteront dans les plus brefs délais.
          </p>

          {/* Dossier Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gray-100 dark:border-gray-700 mb-8">
            {/* Header avec numéro de dossier */}
            <div className="flex items-center justify-center mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-xl flex items-center justify-center mr-4">
                <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
              </div>
              <div>
                <h3 className="text-sm text-gray-500 dark:text-gray-400">Numéro de dossier</h3>
                <p className="text-2xl font-mono font-bold text-[#335FAD] dark:text-[#335FAD]/80">{dossier.numero_dossier}</p>
              </div>
            </div>
            
            <div className="space-y-4 text-sm">
              {/* Statut */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Statut</span>
                <span className={`px-3 py-1.5 rounded-full font-medium flex items-center ${statutInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                  <i className={`${statutInfo?.icon || 'ri-question-line'} mr-1.5 text-sm`}></i>
                  {statutInfo?.text || 'Inconnu'}
                </span>
              </div>

              {/* Type de dossier */}
              {isCouple && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Type</span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-700">
                    <i className="ri-heart-line mr-1.5"></i>
                    Dossier Couple
                  </span>
                </div>
              )}

              {/* Date de création */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">Date de création</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {new Date(dossier.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Informations Client */}
              {clientInfo && (
                <>
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Informations Client
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Nom complet</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {clientInfo.client_prenom} {clientInfo.client_nom}
                    </span>
                  </div>

                  {clientInfo.client_email && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-gray-900 dark:text-white font-medium text-right max-w-xs truncate">
                        {clientInfo.client_email}
                      </span>
                    </div>
                  )}

                  {clientInfo.client_telephone && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Téléphone</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {clientInfo.client_telephone}
                      </span>
                    </div>
                  )}

                  {/* Conjoint si couple */}
                  {isCouple && clientInfo.conjoint_nom && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Conjoint</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {clientInfo.conjoint_prenom} {clientInfo.conjoint_nom}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Informations Prêt */}
              {pretInfo && (
                <>
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Informations du Prêt
                    </h4>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Montant</span>
                    <span className="text-gray-900 dark:text-white font-bold text-lg">
                      {pretInfo.montant_capital.toLocaleString('fr-FR')} €
                    </span>
                  </div>

                  {pretInfo.banque_preteuse && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Banque</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {pretInfo.banque_preteuse}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Durée</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {pretInfo.duree_mois} mois ({Math.round(pretInfo.duree_mois / 12)} ans)
                    </span>
                  </div>

                  {pretInfo.type_pret && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Type de prêt</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {pretInfo.type_pret}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Documents */}
              {hasDocuments && (
                <>
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Documents
                    </h4>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Documents uploadés</span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      <i className="ri-check-line mr-1.5"></i>
                      {dossier.documents!.length} document{dossier.documents!.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              )}

              {/* Statut du traitement */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/10 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <i className="ri-team-line text-[#335FAD] dark:text-[#335FAD]/80 text-lg"></i>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-[#335FAD] dark:text-[#335FAD]/90 mb-1">
                        Dossier en cours d'étude
                      </h5>
                      <p className="text-xs text-gray-700 dark:text-gray-400">
                        Nos équipes GMB Courtage analysent votre dossier et recherchent les meilleures solutions d'assurance pour votre prêt. Vous serez contacté prochainement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commentaire */}
              {dossier.commentaire && (
                <>
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Commentaire
                    </h4>
                    <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                      {dossier.commentaire}
                    </p>
                  </div>
                </>
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

