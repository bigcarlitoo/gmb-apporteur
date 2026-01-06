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
import { formatCurrency } from '@/lib/utils/formatters';
import DocumentUpload from '../../../components/DocumentUpload';
import DossierProgress from '../../../components/DossierProgress';
import { useAuth } from '@/components/AuthProvider';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { ClientLockService, ClientLockResult } from '@/lib/services/client-lock';
import { ApporteursService } from '@/lib/services/apporteurs';
import { DevisDetailModal } from '@/components/features/devis/DevisDetailModal';

// Types pour le dossier admin
export type DossierType = 'seul' | 'couple';

export interface ClientInfo {
  civilite: string;
  nom: string;
  prenom: string;
  nom_naissance: string;
  dateNaissance: string;
  adresse: string;
  code_postal: string;
  ville: string;
  email: string;
  telephone: string;
  categorie_professionnelle: number;
  fumeur: boolean;
  deplacement_pro: number;
  travaux_manuels: number;
  conjoint?: {
    civilite: string;
    nom: string;
    prenom: string;
    nom_naissance: string;
    dateNaissance: string;
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
  
  // États pour la vérification du client lock (anti-contournement)
  const [showClientLockModal, setShowClientLockModal] = useState(false);
  const [clientLockResult, setClientLockResult] = useState<ClientLockResult | null>(null);
  const [isCheckingClientLock, setIsCheckingClientLock] = useState(false);
  const [pendingClientInfo, setPendingClientInfo] = useState<ClientInfo | null>(null);
  
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
  
  // État pour le dossier brouillon créé (nécessaire pour l'extraction et EXADE)
  const [draftDossierId, setDraftDossierId] = useState<string | null>(null);
  // État pour les données extraites des documents
  const [extractedData, setExtractedData] = useState<any>(null);
  // État pour le message d'extraction
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { currentBrokerId } = useBrokerContext();

  // ✅ Données admin depuis l'utilisateur connecté
  const adminData = useMemo<AdminData>(() => {
    const firstName = user?.user_metadata?.prenom || 'Admin';
    const lastName = user?.user_metadata?.nom || '';
    return {
      id: user?.id || '',
      firstName,
      lastName,
      initials: `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase(),
      role: 'Administrateur'
    };
  }, [user]);

  // Liste des apporteurs disponibles depuis Supabase
  const [apporteurs, setApporteurs] = useState<{ id: string; nom: string; prenom: string; email: string }[]>([]);
  const [isLoadingApporteurs, setIsLoadingApporteurs] = useState(true);

  // Charger les apporteurs depuis Supabase
  useEffect(() => {
    const loadApporteurs = async () => {
      if (!currentBrokerId) return;
      
      try {
        setIsLoadingApporteurs(true);
        const data = await ApporteursService.getAllApporteurs(currentBrokerId);
        setApporteurs(data.map((ap: any) => ({
          id: ap.id,
          nom: ap.nom || '',
          prenom: ap.prenom || '',
          email: ap.email || ''
        })));
      } catch (error) {
        console.error('Erreur chargement apporteurs:', error);
        setApporteurs([]);
      } finally {
        setIsLoadingApporteurs(false);
      }
    };

    loadApporteurs();
  }, [currentBrokerId]);

  // État pour l'erreur de génération de devis
  const [devisError, setDevisError] = useState<string | null>(null);

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
        
        if (lockResult.is_locked) {
          // Client déjà verrouillé - afficher la modale
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

  // Confirmer le passage malgré le client lock (pour le même apporteur)
  const handleConfirmClientLockContinue = () => {
    if (pendingClientInfo) {
      setDossierData(prev => ({
        ...prev,
        clientInfo: pendingClientInfo
      }));
      setShowClientLockModal(false);
      setClientLockResult(null);
      setPendingClientInfo(null);
      nextStep();
    }
  };

  // Rediriger vers le dossier existant
  const handleRedirectToExistingDossier = () => {
    if (clientLockResult?.dossier_id) {
      router.push(`/admin/dossiers/${clientLockResult.dossier_id}`);
    }
    setShowClientLockModal(false);
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
  // Crée le dossier brouillon, uploade les documents, lance l'extraction IA, puis génère les devis
  const handleSubmitStep3 = async () => {
    // Vérifier si tous les documents obligatoires sont présents
    const isComplete = isDossierComplete();
    
    if (!isComplete) {
      alert('Veuillez uploader tous les documents obligatoires avant de continuer.');
      return;
    }

    if (!currentBrokerId) {
      alert('Erreur: Aucun courtier sélectionné. Veuillez vous reconnecter.');
      return;
    }

    setIsGeneratingDevis(true);
    setExtractionStatus('Création du dossier...');

    try {
      // Étape 1: Créer le dossier brouillon et uploader les documents
      const formData = new FormData();
      formData.append('type', dossierData.type);
      formData.append('clientInfo', JSON.stringify(dossierData.clientInfo));
      formData.append('commentaire', dossierData.commentaire || '');
      formData.append('isComplete', 'false'); // Brouillon
      formData.append('createdByAdmin', 'true');
      formData.append('broker_id', currentBrokerId);

      // Ajouter les documents
      if (dossierData.documents.offrePret) {
        formData.append('documents.offrePret', dossierData.documents.offrePret);
      }
      if (dossierData.documents.tableauAmortissement) {
        formData.append('documents.tableauAmortissement', dossierData.documents.tableauAmortissement);
      }
      if (dossierData.documents.carteIdentite) {
        formData.append('documents.carteIdentite', dossierData.documents.carteIdentite);
      }
      if (dossierData.type === 'couple' && dossierData.documents.carteIdentiteConjoint) {
        formData.append('documents.carteIdentiteConjoint', dossierData.documents.carteIdentiteConjoint);
      }

      console.log('[AdminNouveauDossier] Création du dossier brouillon...');
      const createResponse = await fetch('/api/dossiers/create', {
        method: 'POST',
        body: formData
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la création du dossier');
      }

      const createResult = await createResponse.json();
      const dossierId = createResult.dossier?.id;

      if (!dossierId) {
        throw new Error('ID du dossier non retourné');
      }

      console.log('[AdminNouveauDossier] Dossier créé:', dossierId);
      setDraftDossierId(dossierId);

      // Étape 2: Lancer l'extraction IA des documents
      setExtractionStatus('Extraction des données des documents...');
      console.log('[AdminNouveauDossier] Lancement de l\'extraction IA...');
      
      const extractionResponse = await fetch('/api/extraction/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId })
      });

      if (!extractionResponse.ok) {
        const extractionError = await extractionResponse.json();
        console.warn('[AdminNouveauDossier] Extraction partielle:', extractionError);
        // On continue même si l'extraction échoue partiellement
      } else {
        const extractionResult = await extractionResponse.json();
        console.log('[AdminNouveauDossier] Extraction réussie:', extractionResult);
        setExtractedData(extractionResult.data);
      }

      // Étape 3: Récupérer les données du dossier mis à jour (avec données extraites)
      setExtractionStatus('Génération des devis...');
      await generateDevisFromDossier(dossierId);
      
      // Passer à l'étape suivante
      nextStep();

    } catch (error: any) {
      console.error('[AdminNouveauDossier] Erreur handleSubmitStep3:', error);
      setDevisError(error?.message || 'Erreur lors du traitement');
      alert(`Erreur: ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setIsGeneratingDevis(false);
      setExtractionStatus(null);
    }
  };

  /**
   * Génère les devis via l'API EXADE en utilisant les données extraites du dossier
   * Cette fonction est appelée après la création du dossier et l'extraction IA
   * Elle utilise le même format que la page de détail (AdminDossierDetailContent.tsx)
   */
  const generateDevisFromDossier = async (dossierId: string) => {
    try {
      console.log('[AdminNouveauDossier] Récupération des données du dossier...');
      
      // Utiliser le client Supabase avec la session utilisateur
      const { createBrowserSupabaseClient } = await import('@/lib/supabase/client');
      const supabaseClient = createBrowserSupabaseClient();

      // Récupérer le dossier avec ses données extraites
      const { data: dossierDb, error: dossierError } = await supabaseClient
        .from('dossiers')
        .select(`
          *,
          client_infos(*),
          pret_data(*)
        `)
        .eq('id', dossierId)
        .single();

      if (dossierError || !dossierDb) {
        throw new Error('Impossible de récupérer les données du dossier');
      }

      // Préparer les données pour l'API EXADE
      // Format identique à AdminDossierDetailContent.tsx
      const clientInfoForExade = Array.isArray(dossierDb.client_infos) 
        ? dossierDb.client_infos[0] 
        : dossierDb.client_infos;
      
      const pretDataForExade = Array.isArray(dossierDb.pret_data)
        ? dossierDb.pret_data[0]
        : dossierDb.pret_data;

      // Si pas de données de prêt extraites, utiliser des valeurs par défaut
      // Mais prévenir l'utilisateur
      if (!pretDataForExade) {
        console.warn('[AdminNouveauDossier] Données de prêt non extraites, utilisation des valeurs par défaut');
      }

      console.log('[AdminNouveauDossier] Appel API EXADE avec:', {
        broker_id: currentBrokerId,
        hasClientInfo: !!clientInfoForExade,
        hasPretData: !!pretDataForExade
      });

      // Appel à l'API EXADE - Format identique à la page de détail
      const response = await fetch('/api/exade/tarifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: currentBrokerId,
          clientInfo: clientInfoForExade || dossierDb,
          pretData: pretDataForExade || dossierDb.infos_pret || {
            montant_capital: 200000,
            duree_mois: 240,
            type_pret_code: 1,
            objet_financement_code: 1
          }
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur API EXADE');
      }

      const tarifs: any[] = payload?.tarifs || [];
      console.log('[AdminNouveauDossier] Tarifs reçus:', tarifs.length);

      if (tarifs.length > 0) {
        // Récupérer les données pour calculer l'économie
        const coutAssuranceBanque = pretDataForExade?.cout_assurance_banque || 0;
        const dureeMois = pretDataForExade?.duree_mois || 240;
        const coutTotalBanque = coutAssuranceBanque * dureeMois;
        
        console.log('[AdminNouveauDossier] Calcul économie:', { coutAssuranceBanque, dureeMois, coutTotalBanque });

        // Mapper les tarifs vers le format DevisAPI
        const devisFromAPI: DevisAPI[] = tarifs.map((t: any, index: number) => {
          const coutTotal = t.cout_total || 0;
          // Calculer l'économie seulement si on a le coût banque
          const economie = coutTotalBanque > 0 ? (coutTotalBanque - coutTotal) : 0;
          
          return {
            id: t.id_tarif || `devis_${index}`,
            compagnie: t.compagnie || 'Compagnie',
            produit: t.nom || 'Produit',
            cout_mensuel: t.mensualite || 0,
            cout_total: coutTotal,
            economie_estimee: economie > 0 ? economie : 0,
            formalites_medicales: t.formalites_medicales || t.formalites_detaillees || [],
            couverture: t.garanties?.map((g: any) => g.nom) || ['Décès', 'PTIA'],
            exclusions: [],
            avantages: [],
            taux_assurance: t.taux_capital_assure || 0,
            frais_adhesion: t.frais_adhesion || 0,
            frais_frac: t.frais_frac || 0
          };
        });

        setDossierData(prev => ({
          ...prev,
          devisGeneres: devisFromAPI
        }));

        console.log('✅ Devis générés avec succès:', devisFromAPI.length);
      } else {
        console.warn('[AdminNouveauDossier] Aucun tarif retourné par EXADE');
        setDevisError('Aucun tarif disponible pour ce profil');
      }

    } catch (error: any) {
      console.error('❌ Erreur génération devis:', error);
      throw error; // Propager l'erreur vers handleSubmitStep3
    }
  };

  // Vérifier si le dossier est complet
  const isDossierComplete = (data?: AdminDossierData) => {
    const currentData = data || dossierData;
    
    if (!currentData.clientInfo) return false;
    
    const clientInfo = currentData.clientInfo;
    const requiredClientFields = ['civilite', 'nom', 'prenom', 'nom_naissance', 'dateNaissance', 'email', 'telephone'];
    
    for (const field of requiredClientFields) {
      if (!clientInfo[field as keyof ClientInfo] || String(clientInfo[field as keyof ClientInfo]).trim() === '') {
        return false;
      }
    }
    
    // Vérifier categorie_professionnelle
    if (!clientInfo.categorie_professionnelle || clientInfo.categorie_professionnelle === 0) {
      return false;
    }

    if (currentData.type === 'couple' && clientInfo.conjoint) {
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
  // Utilise le dossier brouillon créé à l'étape 3 si disponible
  const handleFinalSubmit = async (action: 'assign' | 'email') => {
    setIsSubmitting(true);
    
    try {
      // Si le dossier brouillon existe déjà (créé à l'étape 3), le mettre à jour
      if (draftDossierId) {
        console.log('[AdminNouveauDossier] Mise à jour du dossier existant:', draftDossierId);
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Mettre à jour le statut du dossier
        const newStatut = action === 'assign' ? 'documents_fournis' : 'devis_envoye';
        const { error: updateError } = await supabaseClient
          .from('dossiers')
          .update({
            statut_canon: newStatut,
            apporteur_id: dossierData.apporteurId || null,
            commentaire: dossierData.commentaire,
            devis_selectionne_id: dossierData.devisSelectionne,
            updated_at: new Date().toISOString()
          })
          .eq('id', draftDossierId);

        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`);
        }

        // Créer les devis en base si sélectionné
        if (dossierData.devisSelectionne && dossierData.devisGeneres) {
          const devisResponse = await fetch('/api/admin/devis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dossierId: draftDossierId,
              devis: dossierData.devisGeneres,
              selectedDevisId: dossierData.devisSelectionne
            })
          });

          if (!devisResponse.ok) {
            console.warn('Erreur lors de la création des devis en base');
          }
        }

        // Redirection vers le détail du dossier
        router.push(`/admin/dossiers/${draftDossierId}`);
        return;
      }

      // Fallback: créer un nouveau dossier si pas de brouillon
      console.log('[AdminNouveauDossier] Création d\'un nouveau dossier (fallback)');
      const formData = new FormData();
      formData.append('type', dossierData.type);
      formData.append('clientInfo', JSON.stringify(dossierData.clientInfo));
      formData.append('commentaire', dossierData.commentaire || '');
      formData.append('isComplete', 'true');
      formData.append('createdByAdmin', 'true');
      if (currentBrokerId) formData.append('broker_id', currentBrokerId);
      if (dossierData.apporteurId) formData.append('apporteurId', dossierData.apporteurId);

      const response = await fetch('/api/dossiers/create', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du dossier');
      }

      const result = await response.json();
      router.push(`/admin/dossiers/${result.dossier.id}`);
      
    } catch (error) {
      console.error('Erreur lors de la finalisation du dossier:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour enregistrer le dossier sans l'envoyer
  // Utilise le dossier brouillon créé à l'étape 3 si disponible
  const handleSaveDossier = async () => {
    setIsSubmitting(true);
    
    try {
      // Si le dossier brouillon existe déjà, le mettre à jour
      if (draftDossierId) {
        console.log('[AdminNouveauDossier] Sauvegarde du dossier existant:', draftDossierId);
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Mettre à jour le dossier
        const { error: updateError } = await supabaseClient
          .from('dossiers')
          .update({
            statut_canon: 'documents_fournis',
            apporteur_id: dossierData.apporteurId || null,
            commentaire: dossierData.commentaire,
            devis_selectionne_id: dossierData.devisSelectionne,
            updated_at: new Date().toISOString()
          })
          .eq('id', draftDossierId);

        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`);
        }

        // Créer les devis en base si sélectionné
        if (dossierData.devisSelectionne && dossierData.devisGeneres) {
          try {
            const devisResponse = await fetch('/api/admin/devis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dossierId: draftDossierId,
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
        return;
      }

      // Fallback: créer un nouveau dossier si pas de brouillon
      console.log('[AdminNouveauDossier] Création d\'un nouveau dossier (fallback)');
      const formData = new FormData();
      formData.append('type', dossierData.type);
      formData.append('clientInfo', JSON.stringify(dossierData.clientInfo));
      formData.append('commentaire', dossierData.commentaire || '');
      formData.append('isComplete', 'true');
      formData.append('createdByAdmin', 'true');
      if (currentBrokerId) formData.append('broker_id', currentBrokerId);

      const response = await fetch('/api/dossiers/create', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde du dossier');
      }

      router.push('/admin/dossiers');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du dossier:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Utilisation du formatter centralisé depuis lib/utils/formatters.ts

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
                  {extractionStatus || 'Génération des devis en cours...'}
                </h3>
                <p className="text-[#335FAD]/80 dark:text-[#335FAD]/80">
                  {extractionStatus?.includes('Extraction') 
                    ? 'L\'IA analyse vos documents pour extraire les informations du prêt'
                    : extractionStatus?.includes('Création')
                    ? 'Sauvegarde du dossier et des documents...'
                    : 'Calcul des meilleures offres via l\'API EXADE'
                  }
                </p>
                <div className="mt-4 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg p-3">
                  <p className="text-xs text-[#335FAD] dark:text-[#335FAD] font-medium">
                    🔄 Connecté à l'API EXADE avec la configuration de votre courtier
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
                      <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                        <i className="ri-check-line"></i>
                        <span>Données EXADE en temps réel</span>
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
                            {dossierData.devisGeneres.length > 0 
                              ? formatCurrency(Math.min(...dossierData.devisGeneres.map(d => d.cout_total)))
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Économie max :</span>
                          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                            {dossierData.devisGeneres.length > 0 
                              ? formatCurrency(Math.max(...dossierData.devisGeneres.map(d => d.economie_estimee || 0)))
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Taux moyen :</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {dossierData.devisGeneres.length > 0 
                              ? (dossierData.devisGeneres.reduce((acc, d) => acc + (d.taux_assurance || 0), 0) / dossierData.devisGeneres.length).toFixed(2)
                              : '-'}%
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

      {/* MODAL DÉTAIL DEVIS - Utilise le composant professionnel */}
      {showDevisModal && selectedDevisDetail && (
        <DevisDetailModal
          isOpen={showDevisModal}
          onClose={() => setShowDevisModal(false)}
          devis={{
            id: selectedDevisDetail.id,
            compagnie: selectedDevisDetail.compagnie,
            produit: selectedDevisDetail.produit,
            cout_mensuel: selectedDevisDetail.cout_mensuel,
            cout_total: selectedDevisDetail.cout_total,
            cout_total_tarif: selectedDevisDetail.cout_total,
            economie_estimee: selectedDevisDetail.economie_estimee || 0,
            frais_adhesion: selectedDevisDetail.frais_adhesion || 0,
            frais_frac: selectedDevisDetail.frais_frac || 0,
            id_simulation: '',
            id_tarif: selectedDevisDetail.id,
            detail_pret: {
              capital: 0,
              duree: 0,
              taux_assurance: selectedDevisDetail.taux_assurance || 0
            },
            formalites_medicales: selectedDevisDetail.formalites_medicales || [],
            formalites_detaillees: selectedDevisDetail.formalites_medicales || [],
            couverture: selectedDevisDetail.couverture || [],
            exclusions: selectedDevisDetail.exclusions || [],
            avantages: selectedDevisDetail.avantages || [],
            erreurs: [],
            taux_capital_assure: selectedDevisDetail.taux_assurance,
            donnees_devis: {
              garanties: selectedDevisDetail.couverture?.map((g: string) => ({ nom: g, inclus: true })) || [],
              formalites_medicales: selectedDevisDetail.formalites_medicales || [],
              exclusions: selectedDevisDetail.exclusions || [],
              avantages: selectedDevisDetail.avantages || []
            },
            statut: 'en_attente',
            selected: dossierData.devisSelectionne === selectedDevisDetail.id
          }}
          coutAssuranceBanque={0}
          onRecalculateDevis={async () => {}}
          onSelectDevis={async (devisId) => {
            handleSelectDevis(devisId);
            setShowDevisModal(false);
          }}
          dossierStatut="nouveau"
          brokerId={currentBrokerId || undefined}
          clientInfo={dossierData.clientInfo}
        />
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

      {/* Modale Client Lock - Anti-contournement */}
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
                    Ce client est déjà associé à un dossier existant, géré par{' '}
                    <strong>{clientLockResult.apporteur_prenom} {clientLockResult.apporteur_nom}</strong>.
                  </p>
                  {clientLockResult.locked_at && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Dossier créé le {new Date(clientLockResult.locked_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-2">Vous pouvez :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Consulter et modifier le dossier existant</li>
                    <li>Ou créer quand même un nouveau dossier (déconseillé)</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowClientLockModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmClientLockContinue}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Créer quand même
                  </button>
                  {clientLockResult.dossier_id && (
                    <button
                      onClick={handleRedirectToExistingDossier}
                      className="bg-[#335FAD] hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center"
                    >
                      <i className="ri-folder-open-line mr-2"></i>
                      Voir le dossier existant
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de vérification client lock */}
      {isCheckingClientLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4">
            <i className="ri-loader-4-line text-2xl text-[#335FAD] animate-spin"></i>
            <span className="text-gray-700 dark:text-gray-300">Vérification du client...</span>
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
