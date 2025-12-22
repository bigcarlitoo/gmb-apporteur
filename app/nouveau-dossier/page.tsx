
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import DossierTypeSelection from '../../components/DossierTypeSelection';
import ClientInfoForm from '../../components/ClientInfoForm';
import DocumentUpload from '../../components/DocumentUpload';
import DossierProgress from '../../components/DossierProgress';
import { ClientLockService, ClientLockResult } from '@/lib/services/client-lock';
import { useBrokerContext } from '@/hooks/useBrokerContext';

// Types pour le dossier
export type DossierType = 'seul' | 'couple';

export interface ClientInfo {
  // Client principal - Identité
  civilite: string;
  nom: string;
  prenom: string;
  nom_naissance: string;
  dateNaissance: string;
  lieu_naissance: string;  // OBLIGATOIRE pour Exade
  
  // Adresse séparée (obligatoire Exade)
  adresse: string;
  complement_adresse: string;
  code_postal: string;
  ville: string;
  
  // Contact
  email: string;
  telephone: string;
  
  // Professionnel
  categorie_professionnelle: number;
  revenus: string;
  
  // Santé / Risques (obligatoire pour Generali, SwissLife, MNCAP)
  fumeur: boolean;
  deplacement_pro: number;  // 1 = moins de 20000km, 2 = 20000km+
  travaux_manuels: number;  // 0 = aucun, 1 = léger, 2 = moyen/important
  
  // Client conjoint (si couple)
  conjoint?: {
    civilite: string;
    nom: string;
    prenom: string;
    nom_naissance: string;
    dateNaissance: string;
    lieu_naissance: string;
    categorie_professionnelle: number;
    fumeur: boolean;
    deplacement_pro: number;
    travaux_manuels: number;
  };
}

export interface DocumentsInfo {
  offrePret: File | null;
  tableauAmortissement: File | null;
  carteIdentite: File | null;
  carteIdentiteConjoint?: File | null;
}

// Interface DossierData mise à jour
export interface DossierData {
  type: DossierType;
  clientInfo: ClientInfo | null;
  documents: DocumentsInfo;
  commentaire?: string;
  numeroDossier?: string;
}

// Composant principal avec gestion des paramètres URL
function NouveauDossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBrokerId } = useBrokerContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  
  // États pour la vérification du client lock (anti-contournement)
  const [showClientLockModal, setShowClientLockModal] = useState(false);
  const [clientLockResult, setClientLockResult] = useState<ClientLockResult | null>(null);
  const [isCheckingClientLock, setIsCheckingClientLock] = useState(false);
  const [pendingClientInfo, setPendingClientInfo] = useState<ClientInfo | null>(null);
  
  const [dossierData, setDossierData] = useState<DossierData>({
    type: 'seul',
    clientInfo: null,
    documents: {
      offrePret: null,
      tableauAmortissement: null,
      carteIdentite: null
    },
    commentaire: ''
  });

  // EFFET: Vérifier les paramètres URL pour l'étape
  useEffect(() => {
    const step = searchParams.get('step');
    if (step) {
      const stepNumber = parseInt(step, 10);
      if (stepNumber >= 1 && stepNumber <= 3) {
        setCurrentStep(stepNumber);
      }
    }
  }, [searchParams]);

  // Navigation intelligente vers la page précédente
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Navigation entre les étapes
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Mise à jour du type de dossier
  const handleTypeSelection = (type: DossierType) => {
    setDossierData(prev => ({
      ...prev,
      type,
      documents: {
        ...prev.documents,
        carteIdentiteConjoint: type === 'couple' ? null : undefined
      }
    }));
    nextStep();
  };

  // Mise à jour des informations client avec vérification anti-contournement
  const handleClientInfoUpdate = async (clientInfo: ClientInfo) => {
    // Vérifier si le client est déjà verrouillé (anti-contournement)
    if (currentBrokerId && clientInfo.nom && clientInfo.prenom && clientInfo.dateNaissance) {
      setIsCheckingClientLock(true);
      setPendingClientInfo(clientInfo);
      
      try {
        const lockResult = await ClientLockService.checkClientLock(
          currentBrokerId,
          clientInfo.nom,
          clientInfo.prenom,
          clientInfo.dateNaissance
        );
        
        if (lockResult.is_locked && lockResult.dossier_id) {
          // Client déjà verrouillé - afficher la modale avec redirection
          setClientLockResult(lockResult);
          setShowClientLockModal(true);
          setIsCheckingClientLock(false);
          return; // Ne pas continuer vers l'étape suivante
        }
      } catch (error) {
        console.error('Erreur vérification client lock:', error);
        // En cas d'erreur, on continue (fail-open pour UX)
      } finally {
        setIsCheckingClientLock(false);
      }
    }
    
    // Pas de lock ou erreur - continuer normalement
    setDossierData(prev => ({
      ...prev,
      clientInfo
    }));
    nextStep();
  };

  // Rediriger vers le dossier existant
  const handleRedirectToExistingDossier = () => {
    if (clientLockResult?.dossier_id) {
      router.push(`/dossier/${clientLockResult.dossier_id}`);
    }
    setShowClientLockModal(false);
  };

  // Mise à jour des documents
  const handleDocumentsUpdate = (documents: DocumentsInfo) => {
    setDossierData(prev => ({
      ...prev,
      documents
    }));
  };

  // Mise à jour du commentaire
  const handleCommentaireUpdate = (commentaire: string) => {
    setDossierData(prev => ({
      ...prev,
      commentaire
    }));
  };

  // Vérifier si le dossier est complet
  const isDossierComplete = () => {
    // Vérifier les informations client
    if (!dossierData.clientInfo) return false;
    
    const clientInfo = dossierData.clientInfo;
    const requiredClientFields = ['civilite', 'nom', 'prenom', 'nom_naissance', 'dateNaissance', 'email', 'telephone'];
    
    for (const field of requiredClientFields) {
      if (!clientInfo[field as keyof ClientInfo] || String(clientInfo[field as keyof ClientInfo]).trim() === '') {
        return false;
      }
    }
    
    // Vérifier categorie_professionnelle séparément (c'est un number)
    if (!clientInfo.categorie_professionnelle || clientInfo.categorie_professionnelle === 0) {
      return false;
    }

    // Vérifier les informations conjoint si couple
    if (dossierData.type === 'couple' && clientInfo.conjoint) {
      const requiredConjointFields = ['civilite', 'nom', 'prenom', 'nom_naissance', 'dateNaissance'];
      for (const field of requiredConjointFields) {
        if (!clientInfo.conjoint[field as keyof typeof clientInfo.conjoint] || 
            String(clientInfo.conjoint[field as keyof typeof clientInfo.conjoint]).trim() === '') {
          return false;
        }
      }
      
      // Vérifier categorie_professionnelle du conjoint
      if (!clientInfo.conjoint.categorie_professionnelle || clientInfo.conjoint.categorie_professionnelle === 0) {
        return false;
      }
    }

    // Vérifier les documents obligatoires
    const requiredDocs = ['offrePret', 'tableauAmortissement', 'carteIdentite'];
    if (dossierData.type === 'couple') {
      requiredDocs.push('carteIdentiteConjoint');
    }

    for (const doc of requiredDocs) {
      if (!dossierData.documents[doc as keyof DocumentsInfo]) {
        return false;
      }
    }

    return true;
  };

  // Obtenir la liste des éléments manquants
  const getMissingElements = () => {
    const missing: string[] = [];

    // Vérifier les informations client
    if (!dossierData.clientInfo) {
      missing.push('Informations client');
    } else {
      const clientInfo = dossierData.clientInfo;
      const requiredClientFields = [
        { key: 'civilite', label: 'Civilité' },
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'nom_naissance', label: 'Nom de naissance' },
        { key: 'dateNaissance', label: 'Date de naissance' },
        { key: 'email', label: 'Email' },
        { key: 'telephone', label: 'Téléphone' }
      ];
      
      for (const field of requiredClientFields) {
        if (!clientInfo[field.key as keyof ClientInfo] || String(clientInfo[field.key as keyof ClientInfo]).trim() === '') {
          missing.push(field.label);
        }
      }
      
      // Vérifier catégorie professionnelle
      if (!clientInfo.categorie_professionnelle || clientInfo.categorie_professionnelle === 0) {
        missing.push('Catégorie professionnelle');
      }

      // Vérifier les informations conjoint si couple
      if (dossierData.type === 'couple') {
        if (!clientInfo.conjoint) {
          missing.push('Informations conjoint');
        } else {
          const requiredConjointFields = [
            { key: 'civilite', label: 'Civilité conjoint' },
            { key: 'nom', label: 'Nom conjoint' },
            { key: 'prenom', label: 'Prénom conjoint' },
            { key: 'nom_naissance', label: 'Nom de naissance conjoint' },
            { key: 'dateNaissance', label: 'Date de naissance conjoint' }
          ];
          for (const field of requiredConjointFields) {
            const value = clientInfo.conjoint[field.key as keyof typeof clientInfo.conjoint];
            if (!value || String(value).trim() === '') {
              missing.push(field.label);
            }
          }
          
          // Vérifier catégorie professionnelle du conjoint
          if (!clientInfo.conjoint.categorie_professionnelle || clientInfo.conjoint.categorie_professionnelle === 0) {
            missing.push('Catégorie professionnelle conjoint');
          }
        }
      }
    }

    // Vérifier les documents obligatoires
    const requiredDocs = [
      { key: 'offrePret', label: 'Offre de Prêt' },
      { key: 'tableauAmortissement', label: "Tableau d'Amortissement" },
      { key: 'carteIdentite', label: "Carte d'Identité (Emprunteur)" }
    ];

    if (dossierData.type === 'couple') {
      requiredDocs.push({ key: 'carteIdentiteConjoint', label: "Carte d'Identité (Conjoint)" });
    }

    for (const doc of requiredDocs) {
      if (!dossierData.documents[doc.key as keyof DocumentsInfo]) {
        missing.push(doc.label);
      }
    }

    return missing;
  };

  // Déclencher la soumission du dossier
  const handleSubmitAttempt = () => {
    if (isDossierComplete()) {
      handleFinalSubmit();
    } else {
      setShowIncompleteWarning(true);
    }
  };

  // Fermer l'avertissement
  const handleCloseWarning = () => {
    setShowIncompleteWarning(false);
  };

  // Confirmer la soumission d'un dossier incomplet
  const handleConfirmIncompleteSubmit = () => {
    setShowIncompleteWarning(false);
    handleFinalSubmit();
  };

  // Soumission finale du dossier
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const isComplete = isDossierComplete();
      
      // Préparer les données pour l'envoi
      const formData = new FormData();
      
      // Ajouter les données de base
      formData.append('type', dossierData.type);
      formData.append('clientInfo', JSON.stringify(dossierData.clientInfo));
      formData.append('commentaire', dossierData.commentaire || '');
      formData.append('isComplete', isComplete.toString());
      formData.append('createdByAdmin', 'false');
      
      // Ajouter les fichiers
      if (dossierData.documents.offrePret) {
        formData.append('documents.offrePret', dossierData.documents.offrePret);
      }
      if (dossierData.documents.tableauAmortissement) {
        formData.append('documents.tableauAmortissement', dossierData.documents.tableauAmortissement);
      }
      if (dossierData.documents.carteIdentite) {
        formData.append('documents.carteIdentite', dossierData.documents.carteIdentite);
      }
      if (dossierData.documents.carteIdentiteConjoint) {
        formData.append('documents.carteIdentiteConjoint', dossierData.documents.carteIdentiteConjoint);
      }
      
      console.log('[Client] Envoi des données dossier avec FormData');
      console.log('[Client] Fichiers:', {
        offrePret: dossierData.documents.offrePret?.name,
        tableauAmortissement: dossierData.documents.tableauAmortissement?.name,
        carteIdentite: dossierData.documents.carteIdentite?.name,
        carteIdentiteConjoint: dossierData.documents.carteIdentiteConjoint?.name
      });
      
      const response = await fetch('/api/dossiers/create', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Client] Erreur API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création du dossier');
      }

      const result = await response.json();
      
      // Redirection vers la page de confirmation avec l'ID du dossier
      router.push(`/dossier-confirme/${result.dossier.id}`);
      
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      alert(`Erreur lors de la création du dossier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleGoBack}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Retour à la page précédente"
              >
                <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
              </button>
              <div>
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">
                  Nouveau Dossier Client
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Processus guidé en 3 étapes
                </p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="hidden sm:block">
              <DossierProgress currentStep={currentStep} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Progress - Centré */}
      <div className="sm:hidden px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
        <DossierProgress currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
        {currentStep === 1 && (
          <DossierTypeSelection 
            selectedType={dossierData.type}
            onTypeSelect={handleTypeSelection}
          />
        )}
        
        {currentStep === 2 && (
          <ClientInfoForm 
            dossierType={dossierData.type}
            initialData={dossierData.clientInfo}
            onSubmit={handleClientInfoUpdate}
            onBack={prevStep}
          />
        )}
        
        {currentStep === 3 && (
          <DocumentUpload 
            dossierType={dossierData.type}
            documents={dossierData.documents}
            onDocumentsUpdate={handleDocumentsUpdate}
            onBack={prevStep}
            onSubmit={handleSubmitAttempt}
            isSubmitting={isSubmitting}
            commentaire={dossierData.commentaire}
            onCommentaireChange={handleCommentaireUpdate}
          />
        )}
      </main>

      {/* Modal d'avertissement pour dossier incomplet */}
      {showIncompleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            {/* Contenu entièrement scrollable */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-alert-line text-amber-600 dark:text-amber-400 text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Dossier incomplet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Votre dossier ne contient pas toutes les informations obligatoires. 
                  Voulez-vous quand même l'envoyer ?
                </p>
              </div>

              {/* Liste des éléments manquants */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-3">
                  Éléments manquants :
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    {getMissingElements().map((element, index) => (
                      <li key={index} className="flex items-start">
                        <i className="ri-close-circle-line mr-2 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"></i>
                        <span>{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/70 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <i className="ri-information-line text-[#335FAD] dark:text-[#335FAD] mr-3 mt-0.5 flex-shrink-0"></i>
                  <div className="text-sm text-[#335FAD] dark:text-[#335FAD]/80">
                    <p className="font-medium mb-1">À noter :</p>
                    <p>
                      Les dossiers incomplets peuvent prendre plus de temps à traiter. 
                      Nos équipes vous recontacteront pour obtenir les informations manquantes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCloseWarning}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
                >
                  Compléter le dossier
                </button>
                <button
                  onClick={handleConfirmIncompleteSubmit}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line mr-2 animate-spin inline"></i>
                      Envoi...
                    </>
                  ) : (
                    'Envoyer quand même'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Client déjà référencé (anti-contournement) */}
      {showClientLockModal && clientLockResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowClientLockModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-lg w-full p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-alert-line text-amber-600 dark:text-amber-400 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Client déjà référencé
                  </h3>
                </div>
                <button
                  onClick={() => setShowClientLockModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Ce client est déjà associé à un dossier existant.
                  </p>
                  {clientLockResult.locked_at && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Dossier créé le {new Date(clientLockResult.locked_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Un dossier existe déjà pour ce client. Vous pouvez consulter le dossier existant pour suivre son avancement.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowClientLockModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRedirectToExistingDossier}
                    className="bg-[#335FAD] hover:bg-[#2a4e8f] text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <i className="ri-folder-line mr-2"></i>
                    Voir le dossier existant
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de chargement pour la vérification du client lock */}
      {isCheckingClientLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl flex items-center gap-3">
            <i className="ri-loader-4-line animate-spin text-[#335FAD] text-xl"></i>
            <span className="text-gray-700 dark:text-gray-300">Vérification en cours...</span>
          </div>
        </div>
      )}

    </div>
  );
}

// Composant wrapper avec Suspense pour useSearchParams
export default function NouveauDossierPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initialisation...</p>
        </div>
      </div>
    }>
      <NouveauDossierContent />
    </Suspense>
  );
}
