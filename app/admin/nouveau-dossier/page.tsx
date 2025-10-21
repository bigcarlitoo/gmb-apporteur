'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// SUPPRESSION DU HEADER ADMIN - Gardé seulement le header de base
import DossierTypeSelection from '../../../components/DossierTypeSelection';
import ClientInfoForm from '../../../components/ClientInfoForm';
import DocumentUpload from '../../../components/DocumentUpload';
import DossierProgress from '../../../components/DossierProgress';

// Types pour le dossier admin
export type DossierType = 'seul' | 'couple';

export interface ClientInfo {
  nom: string;
  prenom: string;
  dateNaissance: string;
  profession: string;
  revenus: string;
  fumeur: boolean;
  email: string;
  telephone: string;
  adresse: string;
  conjoint?: {
    nom: string;
    prenom: string;
    dateNaissance: string;
    profession: string;
    revenus: string;
    fumeur: boolean;
  };
}

export interface DocumentsInfo {
  offrePret: File | null;
  tableauAmortissement: File | null;
  carteIdentite: File | null;
  carteIdentiteConjoint?: File | null;
}

// Interface pour les devis de l'API
interface DevisAPI {
  id: string;
  compagnie: string;
  produit: string;
  cout_mensuel: number;
  cout_total: number;
  economie_estimee?: number;
  formalites_medicales: string[];
  couverture: string[];
  exclusions: string[];
  avantages: string[];
  taux_assurance: number;
  frais_adhesion: number;
  frais_frac: number;
}

// Interface pour les données admin
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface DossierData mise à jour pour admin
export interface AdminDossierData {
  type: DossierType;
  clientInfo: ClientInfo | null;
  documents: DocumentsInfo;
  commentaire?: string;
  numeroDossier?: string;
  apporteurId?: string; // ID de l'apporteur assigné
  devisGeneres?: DevisAPI[];
  devisSelectionne?: string;
}

// Composant principal avec gestion des paramètres URL
function AdminNouveauDossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDevis, setIsGeneratingDevis] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [selectedDevisDetail, setSelectedDevisDetail] = useState<DevisAPI | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedApporteur, setSelectedApporteur] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [dossierData, setDossierData] = useState<AdminDossierData>({
    type: 'seul',
    clientInfo: null,
    documents: {
      offrePret: null,
      tableauAmortissement: null,
      carteIdentite: null
    },
    commentaire: '',
    devisGeneres: [],
    devisSelectionne: undefined
  });

  // Données admin simulées
  const adminData = useMemo<AdminData>(() => ({
    id: 'admin1',
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
  }), []);

  // Liste des apporteurs disponibles (TODO: récupérer depuis Supabase)
  const apporteurs = useMemo(() => [
    { id: 'ap1', nom: 'Dubois', prenom: 'Marie', email: 'marie.dubois@email.com' },
    { id: 'ap2', nom: 'Leclerc', prenom: 'Jean', email: 'jean.leclerc@email.com' },
    { id: 'ap3', nom: 'Martin', prenom: 'Paul', email: 'paul.martin@email.com' },
    { id: 'ap4', nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@email.com' }
  ], []);

  // MOCK DATA ENRICHI - Devis simulés pour tester le workflow complet
  // TODO: INTÉGRATION API EXADE - Remplacer par l'appel réel à l'API de génération de devis
  const mockDevis = useMemo<DevisAPI[]>(() => [
    {
      id: 'devis1',
      compagnie: 'Generali',
      produit: 'ASSUREA PRET 7301 CI',
      cout_mensuel: 95.50,
      cout_total: 22920,
      economie_estimee: 44280,
      formalites_medicales: ['Questionnaire de santé simplifié', 'Examen médical si capital > 300k€'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT'],
      exclusions: ['Sports extrêmes', 'Guerre', 'Suicide 1ère année'],
      avantages: ['Remboursement anticipé sans frais', 'Garantie chômage optionnelle', 'Téléconsultation médicale gratuite'],
      taux_assurance: 0.33,
      frais_adhesion: 30,
      frais_frac: 20
    },
    {
      id: 'devis2',
      compagnie: 'Swisslife',
      produit: 'EMPRUNTEUR SECURITE PLUS',
      cout_mensuel: 102.30,
      cout_total: 24552,
      economie_estimee: 42648,
      formalites_medicales: ['Questionnaire de santé détaillé', 'Téléconsultation médicale obligatoire'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT', 'IPP 33%'],
      exclusions: ['Maladies préexistantes non déclarées', 'Sports à risque', 'Alcoolisme chronique'],
      avantages: ['Franchise ITT réduite à 30 jours', 'Prise en charge psychologique', 'Second avis médical gratuit'],
      taux_assurance: 0.39,
      frais_adhesion: 45,
      frais_frac: 12
    },
    {
      id: 'devis3',
      compagnie: 'Allianz',
      produit: 'ALLIANZ EMPRUNTEUR OPTIMAL',
      cout_mensuel: 89.75,
      cout_total: 21540,
      economie_estimee: 45660,
      formalites_medicales: ['Questionnaire de santé en ligne', 'Téléconsultation médicale gratuite'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT', 'Invalidité permanente'],
      exclusions: ['Suicide 1ère année', 'Alcoolisme', 'Usage de stupéfiants'],
      avantages: ['Souscription 100% digitale', 'Tarif préférentiel non-fumeur', 'Application mobile dédiée'],
      taux_assurance: 0.31,
      frais_adhesion: 25,
      frais_frac: 8
    },
    {
      id: 'devis4',
      compagnie: 'Axa',
      produit: 'AXA EMPRUNTEUR SERENITE',
      cout_mensuel: 98.20,
      cout_total: 23568,
      economie_estimee: 43632,
      formalites_medicales: ['Questionnaire médical standard', 'Examen médical selon montant'],
      couverture: ['Décès', 'PTIA', 'ITT 100%', 'IPT 66%'],
      exclusions: ['Pratique de sports aériens', 'Conflits armés', 'Catastrophes naturelles'],
      avantages: ['Garantie dépendance incluse', 'Assistance juridique', 'Service de conciergerie'],
      taux_assurance: 0.35,
      frais_adhesion: 35,
      frais_frac: 15
    },
    {
      id: 'devis5',
      compagnie: 'MAIF',
      produit: 'MAIF PRET HABITATION+',
      cout_mensuel: 87.90,
      cout_total: 21096,
      economie_estimee: 46104,
      formalites_medicales: ['Déclaration de santé simplifiée', 'Examen médical si nécessaire'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT', 'Maladies graves'],
      exclusions: ['Sports extrêmes', 'Tentative de suicide', 'Faute intentionnelle'],
      avantages: ['Tarification solidaire', 'Accompagnement personnalisé', 'Garantie fidélité'],
      taux_assurance: 0.30,
      frais_adhesion: 20,
      frais_frac: 10
    }
  ], []);

  // Initialisation du mode sombre
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const handleDarkModeToggle = (newDarkMode: boolean) => {
    setDarkMode(newDarkMode);
    
    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  };

  // EFFET: Vérifier les paramètres URL pour l'étape
  useEffect(() => {
    const step = searchParams.get('step');
    if (step) {
      const stepNumber = parseInt(step, 10);
      if (stepNumber >= 1 && stepNumber <= 4) {
        setCurrentStep(stepNumber);
      }
    }
  }, [searchParams]);

  // Navigation entre les étapes
  const nextStep = () => {
    if (currentStep < 4) {
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

  // Mise à jour des informations client
  const handleClientInfoUpdate = (clientInfo: ClientInfo) => {
    setDossierData(prev => ({
      ...prev,
      clientInfo
    }));
    nextStep();
  };

  // Mise à jour des documents SANS passage automatique à l'étape suivante
  const handleDocumentsUpdate = async (documents: DocumentsInfo) => {
    setDossierData(prev => ({
      ...prev,
      documents
    }));

    // NE PAS appeler nextStep() automatiquement
    // L'utilisateur doit cliquer sur "Envoyer à l'API" pour continuer
  };

  // Fonction séparée pour la soumission de l'étape 3
  const handleSubmitStep3 = async () => {
    // Vérifier si tous les documents obligatoires sont présents
    const isComplete = isDossierComplete();
    
    if (!isComplete) {
      alert('Veuillez uploader tous les documents obligatoires avant de continuer.');
      return;
    }

    // Générer les devis automatiquement
    await generateDevis(dossierData);
    
    // Passer à l'étape suivante
    nextStep();
  };

  // Génération des devis via l'API
  const generateDevis = async (data: AdminDossierData) => {
    setIsGeneratingDevis(true);
    
    try {
      // Essayer d'abord l'API EXADE réelle
      try {
        const response = await fetch('/api/exade/tarifs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client: {
              nom: data.clientInfo?.nom,
              prenom: data.clientInfo?.prenom,
              dateNaissance: data.clientInfo?.dateNaissance,
              fumeur: data.clientInfo?.fumeur,
              profession: data.clientInfo?.profession,
              revenus: parseFloat(data.clientInfo?.revenus || '0')
            },
            pret: {
              montant: 350000, // Valeur par défaut pour les tests
              duree: 240,
              type: 'immobilier'
            },
            conjoint: data.type === 'couple' ? {
              nom: data.clientInfo?.conjoint?.nom,
              prenom: data.clientInfo?.conjoint?.prenom,
              dateNaissance: data.clientInfo?.conjoint?.dateNaissance,
              fumeur: data.clientInfo?.conjoint?.fumeur,
              profession: data.clientInfo?.conjoint?.profession,
              revenus: parseFloat(data.clientInfo?.conjoint?.revenus || '0')
            } : null
          })
        });

        if (response.ok) {
          const apiResponse = await response.json();
          console.log('✅ Devis générés via API EXADE:', apiResponse);
          
          // Mapper les données de l'API vers notre format
          const devisFromAPI = apiResponse.map((quote: any, index: number) => ({
            id: `devis_api_${index}`,
            compagnie: quote.compagnie || 'Compagnie API',
            produit: quote.produit || 'Produit API',
            cout_mensuel: quote.cout_mensuel || 0,
            cout_total: quote.cout_total || 0,
            economie_estimee: quote.economie_estimee || 0,
            formalites_medicales: quote.formalites_medicales || ['Questionnaire médical'],
            couverture: quote.couverture || ['Décès', 'PTIA', 'ITT'],
            exclusions: quote.exclusions || ['Suicide 1ère année'],
            avantages: quote.avantages || ['Tarif préférentiel'],
            taux_assurance: quote.taux_assurance || 0.35,
            frais_adhesion: quote.frais_adhesion || 30,
            frais_frac: quote.frais_frac || 15
          }));

          setDossierData(prev => ({
            ...prev,
            devisGeneres: devisFromAPI
          }));

          console.log('📋 Nombre de devis API:', devisFromAPI.length);
          return;
        }
      } catch (apiError) {
        console.warn('⚠️ API EXADE non disponible, utilisation des données mock:', apiError);
      }

      // Fallback vers les données mock si l'API échoue
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDossierData(prev => ({
        ...prev,
        devisGeneres: mockDevis
      }));

      console.log('✅ Devis générés avec succès (simulation)');
      console.log('📋 Nombre de devis:', mockDevis.length);
      console.log('💰 Meilleure économie:', Math.max(...mockDevis.map(d => d.economie_estimee || 0)), '€');

    } catch (error) {
      console.error('❌ Erreur génération devis:', error);
      alert('Erreur lors de la génération des devis');
    } finally {
      setIsGeneratingDevis(false);
    }
  };

  // Vérifier si le dossier est complet
  const isDossierComplete = (data?: AdminDossierData) => {
    const currentData = data || dossierData;
    
    if (!currentData.clientInfo) return false;
    
    const clientInfo = currentData.clientInfo;
    const requiredClientFields = ['nom', 'prenom', 'dateNaissance', 'profession', 'email', 'telephone'];
    
    for (const field of requiredClientFields) {
      if (!clientInfo[field as keyof ClientInfo] || String(clientInfo[field as keyof ClientInfo]).trim() === '') {
        return false;
      }
    }

    if (currentData.type === 'couple' && clientInfo.conjoint) {
      const requiredConjointFields = ['nom', 'prenom', 'dateNaissance', 'profession'];
      for (const field of requiredConjointFields) {
        if (!clientInfo.conjoint[field as keyof typeof clientInfo.conjoint] || 
            String(clientInfo.conjoint[field as keyof typeof clientInfo.conjoint]).trim() === '') {
          return false;
        }
      }
    }

    const requiredDocs = ['offrePret', 'tableauAmortissement', 'carteIdentite'];
    if (currentData.type === 'couple') {
      requiredDocs.push('carteIdentiteConjoint');
    }

    for (const doc of requiredDocs) {
      if (!currentData.documents[doc as keyof DocumentsInfo]) {
        return false;
      }
    }

    return true;
  };

  // Sélectionner un devis
  const handleSelectDevis = (devisId: string) => {
    setDossierData(prev => ({
      ...prev,
      devisSelectionne: devisId
    }));
  };

  // Voir les détails d'un devis
  const handleViewDevisDetails = (devis: DevisAPI) => {
    setSelectedDevisDetail(devis);
    setShowDevisModal(true);
  };

  // Assigner à un apporteur
  const handleAssignToApporteur = () => {
    setShowAssignModal(true);
  };

  // Confirmer l'assignation
  const handleConfirmAssign = () => {
    if (selectedApporteur) {
      setDossierData(prev => ({
        ...prev,
        apporteurId: selectedApporteur
      }));
      setShowAssignModal(false);
      handleFinalSubmit('assign');
    }
  };

  // Envoyer directement par email au client
  const handleSendToClient = () => {
    handleFinalSubmit('email');
  };

  // Soumission finale du dossier
  const handleFinalSubmit = async (action: 'assign' | 'email') => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/dossiers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: dossierData.type,
          clientInfo: dossierData.clientInfo,
          commentaire: dossierData.commentaire,
          documents: dossierData.documents,
          devisSelectionne: dossierData.devisSelectionne,
          apporteurId: dossierData.apporteurId,
          action: action,
          isComplete: true,
          createdByAdmin: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du dossier');
      }

      const result = await response.json();
      
      // Si un devis est sélectionné, créer les devis en base
      if (dossierData.devisSelectionne && dossierData.devisGeneres) {
        const selectedDevis = dossierData.devisGeneres.find(d => d.id === dossierData.devisSelectionne);
        if (selectedDevis) {
          // Créer les devis en base via l'API
          const devisResponse = await fetch('/api/admin/devis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dossierId: result.dossier.id,
              devis: dossierData.devisGeneres,
              selectedDevisId: dossierData.devisSelectionne
            })
          });

          if (!devisResponse.ok) {
            console.warn('Erreur lors de la création des devis en base');
          }
        }
      }
      
      // Redirection vers le détail du dossier créé
      router.push(`/admin/dossiers/${result.dossier.id}`);
      
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      alert(`Erreur lors de la création du dossier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour enregistrer le dossier sans l'envoyer
  const handleSaveDossier = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/dossiers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: dossierData.type,
          clientInfo: dossierData.clientInfo,
          commentaire: dossierData.commentaire,
          documents: dossierData.documents,
          devisSelectionne: dossierData.devisSelectionne,
          apporteurId: dossierData.apporteurId,
          action: 'save',
          isComplete: true,
          createdByAdmin: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde du dossier');
      }

      const result = await response.json();
      
      // Si un devis est sélectionné, créer les devis en base
      if (dossierData.devisSelectionne && dossierData.devisGeneres) {
        try {
          const devisResponse = await fetch('/api/admin/devis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              dossierId: result.dossier.id,
              devis: dossierData.devisGeneres,
              selectedDevisId: dossierData.devisSelectionne
            })
          });

          if (!devisResponse.ok) {
            console.warn('Erreur lors de la création des devis en base');
          }
        } catch (devisError) {
          console.warn('Erreur lors de la création des devis:', devisError);
        }
      }
      
      // Redirection vers la page des dossiers admin
      router.push('/admin/dossiers');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du dossier:', error);
      alert(`Erreur lors de la sauvegarde du dossier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* HEADER SIMPLIFIÉ - Sans AdminHeader */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/admin')}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Retour au tableau de bord"
              >
                <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
              </button>
              <div>
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">
                  Créer un Nouveau Dossier
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Processus guidé avec génération automatique des devis
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

      {/* Mobile Progress */}
      <div className="sm:hidden px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
        <DossierProgress currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
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
            onSubmit={handleSubmitStep3}
            isSubmitting={isGeneratingDevis}
            submitButtonText={isGeneratingDevis ? "Envoi à l'API..." : "Envoyer à l'API"}
          />
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Header de l'étape */}
            <div className="text-center">
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                Devis générés automatiquement
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Sélectionnez le meilleur devis et choisissez comment procéder
              </p>
            </div>

            {/* Génération en cours */}
            {isGeneratingDevis && (
              <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/80 rounded-xl p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-[#335FAD] dark:text-[#335FAD]/80 mb-2">
                  Génération des devis en cours...
                </h3>
                <p className="text-[#335FAD]/80 dark:text-[#335FAD]/80">
                  Analyse des documents et calcul des meilleures offres disponibles
                </p>
                <div className="mt-4 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg p-3">
                  <p className="text-xs text-[#335FAD] dark:text-[#335FAD] font-medium">
                    🔄 Simulation API - En production, connecté à l'API Exade
                  </p>
                </div>
              </div>
            )}

            {/* Affichage conditionnel : soit en cours de génération, soit les devis */}
            {!isGeneratingDevis && (
              <>
                {/* Liste des devis - Affichage seulement si devis disponibles */}
                {dossierData.devisGeneres && dossierData.devisGeneres.length > 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Devis disponibles ({dossierData.devisGeneres.length})
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        <i className="ri-information-line"></i>
                        <span>Données simulées pour test</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {dossierData.devisGeneres.map((devis) => (
                        <div 
                          key={devis.id}
                          className={`border-2 rounded-xl p-4 transition-all cursor-pointer hover:shadow-md ${
                            dossierData.devisSelectionne === devis.id
                              ? 'border-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          onClick={() => handleSelectDevis(devis.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                  {devis.compagnie}
                                </h4>
                                {dossierData.devisSelectionne === devis.id && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#335FAD]/10 text-[#335FAD] dark:bg-[#335FAD]/20 dark:text-[#335FAD]/80">
                                    <i className="ri-check-line mr-1"></i>
                                    Sélectionné
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {devis.produit}
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Coût mensuel
                                  </label>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(devis.cout_mensuel)}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Coût total
                                  </label>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(devis.cout_total)}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Économie estimée
                                  </label>
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {formatCurrency(devis.economie_estimee || 0)}
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Taux d'assurance
                                  </label>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {devis.taux_assurance}%
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDevisDetails(devis);
                              }}
                              className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 text-sm font-medium cursor-pointer"
                            >
                              Voir détails
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Formalités: {devis.formalites_medicales.join(', ')}</span>
                            <span>Couverture: {devis.couverture.length} garanties</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Résumé des devis */}
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        📊 Résumé des offres
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Meilleur tarif :</span>
                          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(Math.min(...mockDevis.map(d => d.cout_total)))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Économie max :</span>
                          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(Math.max(...mockDevis.map(d => d.economie_estimee || 0)))}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Taux moyen :</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {(mockDevis.reduce((acc, d) => acc + d.taux_assurance, 0) / mockDevis.length).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* État d'erreur si pas de devis */
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-2xl mb-3"></i>
                    <h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
                      Aucun devis généré
                    </h3>
                    <p className="text-red-700 dark:text-red-300 mb-4">
                      Une erreur s'est produite lors de la génération des devis. Veuillez réessayer.
                    </p>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Retour aux documents
                    </button>
                  </div>
                )}

                {/* Actions finales - Seulement si un devis est sélectionné */}
                {dossierData.devisGeneres && dossierData.devisGeneres.length > 0 && dossierData.devisSelectionne && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Comment souhaitez-vous procéder ?
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={handleAssignToApporteur}
                        disabled={isSubmitting}
                        className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white p-4 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <i className="ri-user-add-line"></i>
                        <span>Assigner à un apporteur</span>
                      </button>
                      
                      <button
                        onClick={handleSendToClient}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white p-4 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <i className="ri-mail-send-line"></i>
                        <span>Envoyer directement au client</span>
                      </button>

                      <button
                        onClick={handleSaveDossier}
                        disabled={isSubmitting}
                        className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white p-4 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <i className="ri-save-line"></i>
                        <span>Enregistrer le dossier</span>
                      </button>
                    </div>
                    
                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={prevStep}
                        className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Retour
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL DÉTAIL DEVIS */}
      {showDevisModal && selectedDevisDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDevisModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-2xl w-full p-6 max-h-[90vh] my-[5vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Détails du devis - {selectedDevisDetail.compagnie}
                </h3>
                <button
                  onClick={() => setShowDevisModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              {/* Badge simulation */}
              <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                <div className="flex items-center">
                  <i className="ri-code-line text-amber-600 dark:text-amber-400 mr-2"></i>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Mode Simulation :</strong> Ces données sont fictives pour tester le workflow. 
                    En production, elles proviendront de l'API Exade.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Informations principales */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-[#335FAD] dark:text-[#335FAD]/80 mb-2">
                    {selectedDevisDetail.produit}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Coût mensuel
                      </label>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedDevisDetail.cout_mensuel)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Coût total
                      </label>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedDevisDetail.cout_total)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Économie estimée
                      </label>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(selectedDevisDetail.economie_estimee || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Couverture */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-shield-check-line mr-2 text-green-500"></i>
                    Couverture
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDevisDetail.couverture.map((item, index) => (
                      <div key={index} className="flex items-center bg-green-50 dark:bg-green-900/20 rounded p-3 border border-green-200 dark:border-green-800">
                        <i className="ri-check-line text-green-600 dark:text-green-400 mr-2"></i>
                        <p className="text-green-800 dark:text-green-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formalités médicales */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-heart-pulse-line mr-2 text-orange-500"></i>
                    Formalités médicales
                  </h4>
                  <div className="space-y-2">
                    {selectedDevisDetail.formalites_medicales.map((formalite, index) => (
                      <div key={index} className="flex items-start bg-orange-50 dark:bg-orange-900/20 rounded p-3 border border-orange-200 dark:border-orange-800">
                        <i className="ri-arrow-right-s-line text-orange-600 dark:text-orange-400 mt-0.5"></i>
                        <p className="text-orange-800 dark:text-orange-300 ml-2">{formalite}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusions */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-error-warning-line mr-2 text-amber-500"></i>
                    Exclusions principales
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDevisDetail.exclusions.map((item, index) => (
                      <div key={index} className="flex items-center bg-amber-50 dark:bg-amber-900/20 rounded p-3 border border-amber-200 dark:border-amber-800">
                        <i className="ri-close-line text-amber-600 dark:text-amber-400 mr-2"></i>
                        <p className="text-amber-800 dark:text-amber-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Avantages */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-star-line mr-2 text-[#335FAD]"></i>
                    Avantages spécifiques
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDevisDetail.avantages.map((item, index) => (
                      <div key={index} className="flex items-center bg-[#335FAD]/5 dark:bg-[#335FAD]/10 rounded p-3 border border-[#335FAD]/20 dark:border-[#335FAD]/30">
                        <i className="ri-star-fill text-[#335FAD] dark:text-[#335FAD]/80 mr-2"></i>
                        <p className="text-[#335FAD] dark:text-[#335FAD]/80">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer avec bouton */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleSelectDevis(selectedDevisDetail.id);
                      setShowDevisModal(false);
                    }}
                    className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <i className="ri-check-line mr-2"></i>
                    Sélectionner ce devis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSIGNATION APPORTEUR */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowAssignModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Assigner à un apporteur
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sélectionner un apporteur
                  </label>
                  <Select value={selectedApporteur} onValueChange={setSelectedApporteur}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un apporteur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {apporteurs.map((apporteur) => (
                        <SelectItem key={apporteur.id} value={apporteur.id}>
                          {apporteur.prenom} {apporteur.nom} - {apporteur.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/70 rounded-lg p-4">
                  <div className="flex items-start">
                    <i className="ri-information-line text-[#335FAD] dark:text-[#335FAD] mr-3 mt-0.5 flex-shrink-0"></i>
                    <div className="text-sm text-[#335FAD] dark:text-[#335FAD]/80">
                      <p className="font-medium mb-1">Information :</p>
                      <p>
                        L'apporteur recevra une notification et pourra gérer le dossier avec le client.
                        Le devis sélectionné sera automatiquement proposé.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmAssign}
                    disabled={!selectedApporteur || isSubmitting}
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin inline"></i>
                        Assignation...
                      </>
                    ) : (
                      'Assigner le dossier'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant wrapper avec Suspense pour useSearchParams
export default function AdminNouveauDossierPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initialisation...</p>
        </div>
      </div>
    }>
      <AdminNouveauDossierContent />
    </Suspense>
  );
}
