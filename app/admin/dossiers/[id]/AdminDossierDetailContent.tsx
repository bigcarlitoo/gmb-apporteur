'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DossiersService } from '@/lib/services/dossiers';
import { DevisService } from '@/lib/services/devis';
import { supabase } from '@/lib/supabase';
import { ClientInfosService } from '@/lib/services/client-infos';
import { PretDataService } from '@/lib/services/pret-data';
import { DocumentsService } from '@/lib/services/documents';
import { DocumentExtractionService } from '@/lib/services/document-extraction';
import { ExtractionResult, ExtractedDataDisplay } from '@/components/ExtractionResult';
import { DataComparisonService } from '@/lib/services/data-comparison';
import DataComparisonModal from '@/components/DataComparisonModal';
import type { DiffReport, ExtractedClientData } from '@/types/data-comparison';
import { 
  CATEGORY_OPTIONS, 
  getCategoryLabel,
  TYPE_PRET_OPTIONS,
  getTypePretLabel,
  OBJET_FINANCEMENT_OPTIONS,
  getObjetFinancementLabel,
  FRAC_ASSURANCE_OPTIONS
} from '@/lib/constants/exade';
import { getStatutBadgeConfig, mapStatutForDisplay } from '@/lib/utils/statut-mapping';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { DocumentViewerModal } from '@/components/features/document-viewer/DocumentViewerModal';
import { DevisCommissionPanel } from '@/components/features/devis/DevisCommissionPanel';
import { CommissionRecommendationCard } from '@/components/features/commission/CommissionRecommendationCard';
import { DevisDetailModal } from '@/components/features/devis/DevisDetailModal';
import { DevisListView } from '@/components/features/devis/DevisListView';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { ExadePushService } from '@/lib/services/exade-push';

// ============================================================================
// INTERFACES POUR L'INTÉGRATION SUPABASE
// ============================================================================

// Interface pour les données admin
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour un dossier détaillé - Correspond aux tables Supabase
interface DossierDetail {
  id: string;
  numero_dossier: string;
  type: 'seul' | 'couple';
  is_couple: boolean;
  // Emprunteur principal
  client_civilite?: string;
  client_nom: string;
  client_prenom: string;
  client_nom_naissance?: string;
  client_email: string;
  client_telephone: string;
  client_date_naissance: string;
  client_adresse: string;
  client_categorie_professionnelle?: number;  // Code Exade 1-11
  client_fumeur: boolean;
  // Informations du conjoint (si dossier couple)
  conjoint_civilite?: string;
  conjoint_nom?: string;
  conjoint_prenom?: string;
  conjoint_nom_naissance?: string;
  conjoint_date_naissance?: string;
  conjoint_categorie_professionnelle?: number;  // Code Exade 1-11
  conjoint_fumeur?: boolean;
  conjoint_email?: string;
  conjoint_telephone?: string;
  apporteur_id: string;
  apporteur_nom: string;
  apporteur_prenom: string;
  apporteur_email: string;
  date_soumission: string;
  // STATUT CRITIQUE - Synchronisé en temps réel avec la DB
  status: 'nouveau' | 'devis_envoye' | 'devis_disponible' | 'valide' | 'refuse' | 'finalise';
  // Métadonnées d'extraction
  extracted_client_data?: any;
  comparison_modal_seen?: boolean;
  last_extraction_at?: string;
  type_assurance: string;
  montant_capital: number;
  duree_pret: number;
  donnees_saisies: any;
  donnees_ia: any;
  infos_pret: any;
  documents: any;
  commentaire_apporteur?: string;
  cout_assurance_banque?: number;
  commentaire_refus?: string;
  date_validation?: string;
  date_refus?: string;
  date_finalisation?: string;
}

// Interface pour un devis avec données API Exade - Table 'devis' Supabase
interface Devis {
  id: string;
  numero_devis?: string;
  statut?: string | null;
  selected?: boolean;
  refused?: boolean;
  motif_refus?: string;
  commentaire_refus?: string;
  date_generation?: string | null;
  compagnie: string;
  produit: string;
  cout_mensuel: number;
  cout_total: number;
  economie_estimee?: number;
  formalites_medicales: string[];
  couverture: string[];
  exclusions: string[];
  avantages: string[];
  // CHAMPS CRITIQUES pour le workflow
  id_simulation: string;
  id_tarif: string;
  cout_total_tarif: number;
  frais_adhesion: number;
  frais_adhesion_apporteur?: number;
  frais_frac: number;
  frais_courtier?: number;
  commission_exade_code?: string;
  detail_pret: {
    capital: number;
    duree: number;
    taux_assurance: number;
  };
  formalites_detaillees: string[];
  erreurs: string[];
  compatible_lemoine?: boolean;
  type_tarif?: string;
  taux_capital_assure?: number;
  donnees_devis?: Record<string, unknown>;
  // Champs pour le workflow push Exade
  exade_simulation_id?: string | null;
  exade_pushed_at?: string | null;
  exade_locked?: boolean;
}

// Interfaces locales pour les états d'édition afin d'éviter les any implicites
interface EditedClientData {
  client_civilite?: string;
  client_nom: string;
  client_prenom: string;
  client_nom_naissance?: string;
  client_email: string;
  client_telephone: string;
  client_date_naissance: string;
  client_adresse: string;
  client_categorie_professionnelle?: number;  // Code Exade 1-11
  client_fumeur: boolean;
  // Informations du conjoint (si dossier couple)
  conjoint_civilite?: string;
  conjoint_nom?: string;
  conjoint_prenom?: string;
  conjoint_nom_naissance?: string;
  conjoint_date_naissance?: string;
  conjoint_categorie_professionnelle?: number;  // Code Exade 1-11
  conjoint_fumeur?: boolean;
  conjoint_email?: string;
  conjoint_telephone?: string;
}

interface EditedPretData {
  banque_preteuse: string;
  montant_capital: number;
  duree_mois: number;
  type_pret: string;           // Libellé textuel (legacy)
  type_pret_code: number;      // Code Exade 1-10
  objet_financement_code: number; // Code Exade 1-8
  cout_assurance_banque: number | null;
  frac_assurance: number;      // 10 = Prime unique, 12 = Mensuel
}

interface AdminDossierDetailContentProps {
  dossierId: string;
}

export default function AdminDossierDetailContent({ dossierId }: AdminDossierDetailContentProps) {
  const router = useRouter();
  const { currentBrokerId } = useBrokerContext();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [coutAssuranceBanque, setCoutAssuranceBanque] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDevis, setSelectedDevis] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [selectedDevisDetail, setSelectedDevisDetail] = useState<Devis | null>(null);

  // États pour l'édition
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isEditingPret, setIsEditingPret] = useState(false);
  const [editedClientData, setEditedClientData] = useState<EditedClientData>({
    client_civilite: '',
    client_nom: '',
    client_prenom: '',
    client_nom_naissance: '',
    client_email: '',
    client_telephone: '',
    client_date_naissance: '',
    client_adresse: '',
    client_categorie_professionnelle: 0,
    client_fumeur: false,
    // Informations du conjoint (si dossier couple)
    conjoint_civilite: '',
    conjoint_nom: '',
    conjoint_prenom: '',
    conjoint_nom_naissance: '',
    conjoint_date_naissance: '',
    conjoint_categorie_professionnelle: 0,
    conjoint_fumeur: false,
    conjoint_email: '',
    conjoint_telephone: ''
  });
  const [editedPretData, setEditedPretData] = useState<EditedPretData>({
    banque_preteuse: '',
    montant_capital: 0,
    duree_mois: 0,
    type_pret: '',
    type_pret_code: 1,           // Par défaut: Amortissable
    objet_financement_code: 1,   // Par défaut: Résidence principale
    cout_assurance_banque: null,
    frac_assurance: 12           // Par défaut: Mensuel
  });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);

  // États pour l'ajout de documents
  const [newDocumentType, setNewDocumentType] = useState<string>('');
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // États pour l'extraction de documents
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isRefreshingDevis, setIsRefreshingDevis] = useState(false);

  // États pour la comparaison de données
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [extractedClientData, setExtractedClientData] = useState<ExtractedClientData | null>(null);
  const [autoCheckDone, setAutoCheckDone] = useState(false);

  // État pour la modale de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState(''); // Pour ne vérifier qu'une fois au chargement

  // Données admin simulées
  const adminData = useMemo<AdminData>(() => ({
    id: '00000000-0000-0000-0000-000000000001', // UUID valide pour l'admin
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
  }), []);

  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DU DOSSIER EN TEMPS RÉEL
  // ============================================================================

  /**
   * ÉTAT PRINCIPAL DU DOSSIER
   * 
   * Cet état doit être synchronisé en temps réel avec Supabase via :
   * 1. Récupération initiale depuis les tables jointes
   * 2. Subscription temps réel pour les mises à jour de statut
   * 3. Mise à jour automatique quand l'apporteur valide/refuse
   * 
   * Tables Supabase impliquées :
   * - dossiers (statut principal, dates de validation/refus/finalisation)
   * - client_infos (données client)
   * - apporteur_profiles (infos apporteur)
   * - documents (fichiers joints)
   * 
   * NOTE: Plus de données mock - tout est chargé depuis la DB
   */
  const [dossier, setDossier] = useState<DossierDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * ÉTAT DES DEVIS - SYNCHRONISÉ AVEC L'API EXADE ET SUPABASE
   * 
   * Cet état contient tous les devis générés pour ce dossier :
   * 1. Données issues de l'API Exade (tarifs, formalités, etc.)
   * 2. Statuts de sélection/refus gérés par l'admin
   * 3. Mise à jour temps réel quand l'apporteur/client valide ou refuse
   * 
   * Workflow complet :
   * - Admin sélectionne un devis -> selected = true, autres = false
   * - Statut dossier passe à 'devis_envoye'
   * - Apporteur/client valide -> statut dossier = 'valide'
   * - Apporteur/client refuse -> statut dossier = 'refuse', devis.refused = true
   * - Admin peut sélectionner un autre devis après refus
   * 
   * NOTE: Plus de données mock - tout est chargé depuis la DB/API
   */
  const [devis, setDevis] = useState<Devis[]>([]);

  // Charger et appliquer les données DB (remplace les mocks)
  /**
   * Fonction pour charger/recharger les données du dossier
   */
  const loadDossierData = async () => {
    try {
      const data: any = await DossiersService.getDossierById(dossierId);
      if (!data) return;
      const ci = Array.isArray(data.client_infos) ? data.client_infos[0] : null;
      const pret = Array.isArray(data.pret_data) ? data.pret_data[0] : null;
      const docs = Array.isArray(data.documents) ? data.documents : [];
      const canon = (data.statut as any) || 'en_attente';
      // ✅ Utilisation de la source de vérité unique pour mapper statut canonique → statut affichage
      const statusForDisplay = mapStatutForDisplay(canon);
      setDossier(prev => ({
        ...(prev as any),
        id: data.id,
        numero_dossier: data.numero_dossier,
        type: (data.is_couple ? 'couple' : 'seul'),
        is_couple: data.is_couple || false,
        client_nom: ci?.client_nom || '',
        client_prenom: ci?.client_prenom || '',
        client_email: ci?.client_email || '',
        client_telephone: ci?.client_telephone || '',
        client_date_naissance: ci?.client_date_naissance || '',
        client_adresse: ci?.client_adresse || '',
        client_profession: ci?.client_profession || '',
        client_fumeur: !!ci?.client_fumeur,
        // Informations du conjoint (si dossier couple)
        conjoint_nom: ci?.conjoint_nom || '',
        conjoint_prenom: ci?.conjoint_prenom || '',
        conjoint_date_naissance: ci?.conjoint_date_naissance || '',
        conjoint_profession: ci?.conjoint_profession || '',
        conjoint_revenus: ci?.conjoint_revenus || '',
        conjoint_fumeur: !!ci?.conjoint_fumeur,
        apporteur_id: data.apporteur_id || '',
        apporteur_nom: data.apporteur_profiles?.nom || (prev as any)?.apporteur_nom || '',
        apporteur_prenom: data.apporteur_profiles?.prenom || (prev as any)?.apporteur_prenom || '',
        apporteur_email: data.apporteur_profiles?.email || (prev as any)?.apporteur_email || '',
        date_soumission: data.created_at || (prev as any)?.date_soumission || '',
        status: statusForDisplay,
        type_assurance: pret?.type_pret || (prev as any)?.type_assurance || 'Prêt Immobilier',
        montant_capital: Number(pret?.montant_capital || (prev as any)?.montant_capital || 0),
        duree_pret: Number(pret?.duree_mois || ((prev as any)?.duree_pret || 0) * 12) / 12,
        infos_pret: {
          ...(prev as any)?.infos_pret,
          banque_preteuse: pret?.banque_preteuse || (prev as any)?.infos_pret?.banque_preteuse || '',
          montant_capital: Number(pret?.montant_capital || (prev as any)?.infos_pret?.montant_capital || 0),
          duree_mois: Number(pret?.duree_mois || (prev as any)?.infos_pret?.duree_mois || 0),
          type_pret: pret?.type_pret || (prev as any)?.infos_pret?.type_pret || '',
          type_pret_code: pret?.type_pret_code || (prev as any)?.infos_pret?.type_pret_code || 1,
          objet_financement_code: pret?.objet_financement_code || (prev as any)?.infos_pret?.objet_financement_code || 1,
        },
        documents: mapDocumentsFromRows(docs, (prev as any)?.documents),
        commentaire_apporteur: data.commentaire || undefined
      }) as any);

      // Charger les données d'extraction après avoir chargé les données du dossier
      await loadExtractionData();

    } catch (e) {
      console.error('[AdminDetail] fetch DB error', e);
    }
  };

  useEffect(() => {
    loadDossierData();
  }, [dossierId]);

  // Vérifier automatiquement au chargement si une extraction récente a des différences
  useEffect(() => {
    const checkPendingExtraction = async () => {
      // Ne vérifier qu'une seule fois et seulement si le dossier est chargé
      if (autoCheckDone || !dossier?.id) return;

      try {
        // Récupérer les métadonnées d'extraction depuis la DB
        const { data: dossierMeta, error } = await supabase
          .from('dossiers')
          .select('extracted_client_data, comparison_modal_seen, last_extraction_at')
          .eq('id', dossierId)
          .single();

        if (error) {
          console.error('[AdminDetail] Erreur récupération métadonnées extraction:', error);
          return;
        }

        // Vérifier si on doit afficher la modale automatiquement
        const shouldShowModal =
          dossierMeta?.extracted_client_data &&
          !dossierMeta?.comparison_modal_seen &&
          dossierMeta?.last_extraction_at;

        if (shouldShowModal) {
          console.log('[AdminDetail] Extraction récente non vue détectée, vérification des différences...');

          // Simuler les données extraites comme si elles venaient de l'API
          const simulatedExtraction = {
            emprunteurs: dossierMeta.extracted_client_data,
            nombreAssures: dossierMeta.extracted_client_data.nombreAssures,
            metadata: {
              champsManquants: dossierMeta.extracted_client_data.champsManquants || []
            }
          };

          // Lancer la comparaison
          await checkDataDifferences(simulatedExtraction);
        }

        setAutoCheckDone(true);
      } catch (error) {
        console.error('[AdminDetail] Erreur vérification extraction automatique:', error);
        setAutoCheckDone(true);
      }
    };

    if (dossier?.id) {
      checkPendingExtraction();
    }
  }, [dossier?.id, autoCheckDone]);

  function mapDocumentsFromRows(rows: any[], prevDocs?: any) {
    const findDocMulti = (types: string[]) => rows.find((r: any) => types.includes(r.document_type));
    const toObj = (row?: any) => row ? {
      id: row.id, // Ajout de l'ID pour la suppression
      nom: row.document_name,
      url: row.storage_path,
      taille: row.file_size ? `${(row.file_size / (1024 * 1024)).toFixed(1)} MB` : '',
      type: row.document_type // Ajout du type pour l'affichage
    } : null;

    // Types principaux
    const principalTypes = ['offre_pret', 'offrePret', 'tableau_amortissement', 'tableauAmortissement',
      'carte_identite', 'carteIdentite', 'carte_identite_conjoint', 'carteIdentiteConjoint'];

    // Filtrer les autres documents (tous sauf les types principaux)
    const autresDocuments = rows
      .filter((r: any) => !principalTypes.includes(r.document_type))
      .map((r: any) => toObj(r));

    return {
      offre_pret: toObj(findDocMulti(['offre_pret', 'offrePret'])) || prevDocs?.offre_pret || null,
      tableau_amortissement: toObj(findDocMulti(['tableau_amortissement', 'tableauAmortissement'])) || prevDocs?.tableau_amortissement || null,
      carte_identite: toObj(findDocMulti(['carte_identite', 'carteIdentite'])) || prevDocs?.carte_identite || null,
      carte_identite_conjoint: toObj(findDocMulti(['carte_identite_conjoint', 'carteIdentiteConjoint'])) || prevDocs?.carte_identite_conjoint || null,
      autres: autresDocuments.length > 0 ? autresDocuments : (prevDocs?.autres || []),
    };
  }

  const buildPublicUrl = (key: string) => {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    return `${base}/storage/v1/object/public/documents/${key}`
  }

  /**
   * Convertit les types de documents en labels lisibles
   */
  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'offrePret': 'Offre de Prêt',
      'tableauAmortissement': 'Tableau d\'Amortissement',
      'carteIdentite': 'Carte d\'Identité',
      'carteIdentiteConjoint': 'Carte d\'Identité (Conjoint)',
      'bulletinDePaie': 'Bulletin de Paie',
      'avisImposition': 'Avis d\'Imposition',
      'contratTravail': 'Contrat de Travail',
      'autre': 'Autre Document'
    };
    return labels[type] || type;
  }

  // Charger devis depuis DB; si vide, appeler EXADE puis semer en DB et recharger
  useEffect(() => {
    (async () => {
      if (!dossier?.id) return;
      try {
        // 1) Lire devis DB
        const dbDevis = await DevisService.getDevisByDossierId(dossier.id);
        if (dbDevis && dbDevis.length > 0) {
          // essayer de récupérer le devis sélectionné si disponible dans le dossier
          const selectedId = (dossier as any)?.devis_selectionne_id || null;
          setDevis(dbDevis.map((d: any) => ({
            id: d.id,
            numero_devis: d.numero_devis,
            statut: d.statut,
            selected: selectedId ? d.id === selectedId : false,
            refused: d.statut === 'refuse',
            motif_refus: (d.donnees_devis as any)?.motif_refus,
            commentaire_refus: (d.donnees_devis as any)?.commentaire_refus,
            date_generation: d.date_generation,
            date_envoi: d.date_envoi,
            compagnie: (d.donnees_devis as any)?.compagnie || (d.donnees_devis as any)?.compagnie_libelle || 'Compagnie',
            produit: (d.donnees_devis as any)?.produit || (d.donnees_devis as any)?.reference || '',
            cout_mensuel: (d.donnees_devis as any)?.mensualite || (d.donnees_devis as any)?.cout_mensuel || 0,
            cout_total: (d.donnees_devis as any)?.primeTotale || (d.donnees_devis as any)?.cout_total || 0,
            economie_estimee: (d.donnees_devis as any)?.economie_estimee,
            formalites_medicales: (d.donnees_devis as any)?.garanties?.map((g: any) => g.libelle) || [],
            couverture: (d.donnees_devis as any)?.couverture || [],
            exclusions: (d.donnees_devis as any)?.exclusions || [],
            avantages: (d.donnees_devis as any)?.avantages || [],
            id_simulation: (d.donnees_devis as any)?.id_simulation || '',
            id_tarif: (d.donnees_devis as any)?.id_tarif || (d.donnees_devis as any)?.reference || '',
            cout_total_tarif: (d.donnees_devis as any)?.cout_total_tarif || (d.donnees_devis as any)?.primeTotale || 0,
            frais_adhesion: (d.donnees_devis as any)?.frais_adhesion || 0,
            frais_frac: (d.donnees_devis as any)?.frais_frac || 0,
            detail_pret: {
              capital: (d.donnees_devis as any)?.detail_pret?.capital || dossier.montant_capital,
              duree: (d.donnees_devis as any)?.detail_pret?.duree || dossier.duree_pret * 12,
              taux_assurance: (d.donnees_devis as any)?.detail_pret?.taux_assurance || (dossier as any)?.infos_pret?.taux_assurance || 0
            },
            formalites_detaillees: (d.donnees_devis as any)?.formalites_detaillees || [],
            erreurs: (d.donnees_devis as any)?.erreurs || []
          })) as Devis[]);
          return;
        }

        // 2) Aucun devis: tenter EXADE
        try {
          const resp = await fetch('/api/exade/tarifs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              broker_id: currentBrokerId,
              clientInfo: (dossier as any), 
              pretData: (dossier as any).infos_pret 
            })
          });
          const payload = await resp.json();
          if (!resp.ok) throw new Error(payload?.error || 'Erreur EXADE');
          const tarifs: any[] = payload?.tarifs || [];

          if (tarifs.length > 0) {
            const devisToInsert = tarifs.map((t: any, index: number) => ({
              dossier_id: dossier.id,
              numero_devis: `EX-${Date.now()}-${index + 1}`,
              statut: 'en_attente',
              donnees_devis: t,
              date_generation: new Date().toISOString(),
              date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }));
            await DevisService.createMultipleDevis(devisToInsert as any);
          }
        } catch (exErr) {
          console.error('[AdminDetail] Erreur lors de la génération des devis EXADE', exErr);
          // Afficher un message d'erreur à l'utilisateur mais ne pas créer de données fictives
        }

        // 3) Relire depuis DB
        const freshDevis = await DevisService.getDevisByDossierId(dossier.id);
        const selectedId = (dossier as any)?.devis_selectionne_id || null;
        setDevis((freshDevis as any).map((d: any) => ({
          ...d,
          selected: selectedId ? d.id === selectedId : false,
          refused: d.statut === 'refuse'
        })));
      } catch (e) {
        console.error('[AdminDetail] devis load/seed error', e);
      }
    })();
  }, [dossier?.id]);

  // État pour l'historique complet des devis
  const [devisHistory, setDevisHistory] = useState<any[]>([]);

  // Charger l'historique complet des devis
  useEffect(() => {
    (async () => {
      if (!dossier?.id) return;
      try {
        const history = await DossiersService.getDevisHistory(dossier.id);
        setDevisHistory(history);
      } catch (e) {
        console.error('[AdminDetail] Erreur chargement historique devis:', e);
      }
    })();
  }, [dossier?.id]);

  // ============================================================================
  // SUPABASE INTEGRATION - FONCTIONS DE RÉCUPÉRATION ET SUBSCRIPTION TEMPS RÉEL
  // ============================================================================

  /**
   * FONCTION DE RÉCUPÉRATION COMPLÈTE DU DOSSIER
   * 
   * Cette fonction doit être appelée au montage du composant pour récupérer :
   * 1. Le dossier avec toutes ses relations (JOIN)
   * 2. Tous les devis associés au dossier
   * 3. Les documents depuis Supabase Storage
   * 
   * Requête SQL équivalente :
   * ```sql
   * SELECT 
   *   d.*,
   *   ci.nom, ci.prenom, ci.email, ci.telephone, ci.date_naissance,
   *   ci.adresse, ci.profession, ci.fumeur,
   *   ap.nom as apporteur_nom, ap.prenom as apporteur_prenom, 
   *   ap.email as apporteur_email
   * FROM dossiers d
   * LEFT JOIN client_infos ci ON ci.dossier_id = d.id
   * LEFT JOIN apporteur_profiles ap ON ap.user_id = d.apporteur_id
   * WHERE d.id = $1
   * ```
   * 
   * Puis récupération des devis :
   * ```sql
   * SELECT * FROM devis WHERE dossier_id = $1 ORDER BY cout_total ASC
   * ```
   */
  const fetchDossierComplet = async () => {
    try {
      // SUPABASE: Récupération du dossier complet
      /*
      const { data: dossierData, error: dossierError } = await supabase
        .from('dossiers')
        .select(`
          *,
          client_infos(*),
          apporteur_profiles(*),
          documents(*)
        `)
        .eq('id', dossierId)
        .single();

      if (dossierError) throw dossierError;

      // Récupération des devis
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('cout_total', { ascending: true });

      if (devisError) throw devisError;

      // Mise à jour des états locaux
      setDossier(dossierData);
      setDevis(devisData);
      */
    } catch (error) {
      console.error('Erreur récupération dossier:', error);
    }
  };

  /**
   * SUBSCRIPTION TEMPS RÉEL POUR LES MISES À JOUR
   * 
   * Cette subscription écoute les changements sur :
   * 1. Table 'dossiers' - Changements de statut
   * 2. Table 'devis' - Sélections/refus de devis
   * 3. Table 'client_infos' - Modifications des données client
   * 
   * Permet la synchronisation automatique entre :
   * - Interface admin (cette page)
   * - Interface apporteur
   * - Interface client
   */
  useEffect(() => {
    // SUPABASE: Établir les subscriptions temps réel
    /*
    const dossierSubscription = supabase
      .channel('dossier-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dossiers',
        filter: `id=eq.${dossierId}`
      }, (payload) => {
        console.log('Dossier mis à jour:', payload.new);
        setDossier(prev => ({ ...prev, ...payload.new }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'devis',
        filter: `dossier_id=eq.${dossierId}`
      }, (payload) => {
        console.log('Devis mis à jour:', payload.new);
        setDevis(prev => prev.map(d => 
          d.id === payload.new.id ? { ...d, ...payload.new } : d
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dossierSubscription);
    };
    */
  }, [dossierId]);

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

  // Initialiser le formulaire une seule fois à partir des données DB chargées
  const [didInitForm, setDidInitForm] = useState(false);
  useEffect(() => {
    if (!didInitForm && dossier?.id) {
      setEditedClientData({
        client_nom: dossier.client_nom,
        client_prenom: dossier.client_prenom,
        client_email: dossier.client_email,
        client_telephone: dossier.client_telephone,
        client_date_naissance: dossier.client_date_naissance,
        client_adresse: dossier.client_adresse,
        client_categorie_professionnelle: dossier.client_categorie_professionnelle || 0,
        client_fumeur: dossier.client_fumeur,
        // Informations du conjoint (si dossier couple)
        conjoint_nom: dossier.conjoint_nom || '',
        conjoint_prenom: dossier.conjoint_prenom || '',
        conjoint_date_naissance: dossier.conjoint_date_naissance || '',
        conjoint_categorie_professionnelle: dossier.conjoint_categorie_professionnelle || 0,
        conjoint_fumeur: dossier.conjoint_fumeur || false
      });

      setEditedPretData({
        banque_preteuse: dossier.infos_pret.banque_preteuse,
        montant_capital: dossier.infos_pret.montant_capital,
        duree_mois: dossier.infos_pret.duree_mois,
        type_pret: dossier.infos_pret.type_pret,
        type_pret_code: dossier.infos_pret.type_pret_code || 1,
        objet_financement_code: dossier.infos_pret.objet_financement_code || 1,
        cout_assurance_banque: dossier.infos_pret.cout_assurance_banque
      });
      setDidInitForm(true);
    }
  }, [dossier, didInitForm]);

  // Si on navigue vers un autre dossier, ré-initialiser le formulaire
  useEffect(() => {
    setDidInitForm(false);
  }, [dossier?.id]);

  const handleStartEditClient = () => {
    if (!dossier) return;
    // Toujours pré-remplir depuis le dossier courant avant d'entrer en mode édition
    setEditedClientData({
      client_civilite: dossier.client_civilite || '',
      client_nom: dossier.client_nom,
      client_prenom: dossier.client_prenom,
      client_nom_naissance: dossier.client_nom_naissance || '',
      client_email: dossier.client_email,
      client_telephone: dossier.client_telephone,
      client_date_naissance: dossier.client_date_naissance,
      client_adresse: dossier.client_adresse,
      client_categorie_professionnelle: dossier.client_categorie_professionnelle || 0,
      client_fumeur: dossier.client_fumeur,
      // Informations du conjoint (si dossier couple)
      conjoint_civilite: dossier.conjoint_civilite || '',
      conjoint_nom: dossier.conjoint_nom || '',
      conjoint_prenom: dossier.conjoint_prenom || '',
      conjoint_nom_naissance: dossier.conjoint_nom_naissance || '',
      conjoint_date_naissance: dossier.conjoint_date_naissance || '',
      conjoint_categorie_professionnelle: dossier.conjoint_categorie_professionnelle || 0,
      conjoint_fumeur: dossier.conjoint_fumeur || false,
      conjoint_email: dossier.conjoint_email || '',
      conjoint_telephone: dossier.conjoint_telephone || ''
    });
    setIsEditingClient(true);
  };

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

  // ============================================================================
  // SUPABASE INTEGRATION - SAUVEGARDE DES MODIFICATIONS
  // ============================================================================

  /**
   * SAUVEGARDE DES DONNÉES CLIENT
   * 
   * Met à jour la table 'client_infos' avec les modifications admin
   * Synchronise automatiquement avec l'interface apporteur
   */
  const handleSaveClientData = async () => {
    if (!dossier) return;
    try {
      console.log('Sauvegarde des données client:', editedClientData);

      // Validation basique + sauvegarde via service (update si existe, sinon insert)
      const payload: any = {
        dossier_id: dossier.id,
        client_civilite: editedClientData.client_civilite || null,
        client_nom: editedClientData.client_nom,
        client_prenom: editedClientData.client_prenom,
        client_nom_naissance: editedClientData.client_nom_naissance || null,
        client_email: editedClientData.client_email,
        client_telephone: editedClientData.client_telephone,
        client_date_naissance: editedClientData.client_date_naissance,
        client_adresse: editedClientData.client_adresse,
        categorie_professionnelle: editedClientData.client_categorie_professionnelle || null,
        client_fumeur: editedClientData.client_fumeur,
        // Informations du conjoint (si dossier couple)
        conjoint_civilite: editedClientData.conjoint_civilite || null,
        conjoint_nom: editedClientData.conjoint_nom || null,
        conjoint_prenom: editedClientData.conjoint_prenom || null,
        conjoint_nom_naissance: editedClientData.conjoint_nom_naissance || null,
        conjoint_date_naissance: editedClientData.conjoint_date_naissance || null,
        conjoint_categorie_professionnelle: editedClientData.conjoint_categorie_professionnelle || null,
        conjoint_fumeur: editedClientData.conjoint_fumeur || false,
        conjoint_email: editedClientData.conjoint_email || null,
        conjoint_telephone: editedClientData.conjoint_telephone || null,
      };
      const validationErrors = ClientInfosService.validateClientData(payload);
      if (validationErrors.length > 0) {
        alert(validationErrors.join('\n'));
        return;
      }
      const saved = await ClientInfosService.upsertClientInfo(payload);

      // Mettre à jour l'état local (sera synchronisé par subscription)
      setDossier(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          client_civilite: saved?.client_civilite ?? editedClientData.client_civilite,
          client_nom: saved?.client_nom ?? editedClientData.client_nom,
          client_prenom: saved?.client_prenom ?? editedClientData.client_prenom,
          client_nom_naissance: saved?.client_nom_naissance ?? editedClientData.client_nom_naissance,
          client_email: saved?.client_email ?? editedClientData.client_email,
          client_telephone: saved?.client_telephone ?? editedClientData.client_telephone,
          client_date_naissance: saved?.client_date_naissance ?? editedClientData.client_date_naissance,
          client_adresse: saved?.client_adresse ?? editedClientData.client_adresse,
          client_categorie_professionnelle: saved?.categorie_professionnelle ?? editedClientData.client_categorie_professionnelle,
          client_fumeur: saved?.client_fumeur ?? editedClientData.client_fumeur,
          // Informations du conjoint (si dossier couple)
          conjoint_civilite: saved?.conjoint_civilite ?? editedClientData.conjoint_civilite,
          conjoint_nom: saved?.conjoint_nom ?? editedClientData.conjoint_nom,
          conjoint_prenom: saved?.conjoint_prenom ?? editedClientData.conjoint_prenom,
          conjoint_nom_naissance: saved?.conjoint_nom_naissance ?? editedClientData.conjoint_nom_naissance,
          conjoint_date_naissance: saved?.conjoint_date_naissance ?? editedClientData.conjoint_date_naissance,
          conjoint_categorie_professionnelle: saved?.conjoint_categorie_professionnelle ?? editedClientData.conjoint_categorie_professionnelle,
          conjoint_fumeur: saved?.conjoint_fumeur ?? editedClientData.conjoint_fumeur,
          conjoint_email: saved?.conjoint_email ?? editedClientData.conjoint_email,
          conjoint_telephone: saved?.conjoint_telephone ?? editedClientData.conjoint_telephone,
        };
      });

      // Pas de refetch immédiat pour éviter d'écraser l'état si la DB est ralentie
      setIsEditingClient(false);
    } catch (error: any) {
      console.error('Erreur sauvegarde données client:', error);
      alert(error?.message || 'Erreur lors de la sauvegarde des données client');
    }
  };

  const handleCancelEditClient = () => {
    if (!dossier) return;
    setIsEditingClient(false);
    // Réinitialiser les données éditées avec les données actuelles du dossier
    setEditedClientData({
      client_civilite: dossier.client_civilite || '',
      client_nom: dossier.client_nom,
      client_prenom: dossier.client_prenom,
      client_nom_naissance: dossier.client_nom_naissance || '',
      client_email: dossier.client_email,
      client_telephone: dossier.client_telephone,
      client_date_naissance: dossier.client_date_naissance,
      client_adresse: dossier.client_adresse,
      client_categorie_professionnelle: dossier.client_categorie_professionnelle || 0,
      client_fumeur: dossier.client_fumeur,
      conjoint_civilite: dossier.conjoint_civilite || '',
      conjoint_nom: dossier.conjoint_nom || '',
      conjoint_prenom: dossier.conjoint_prenom || '',
      conjoint_nom_naissance: dossier.conjoint_nom_naissance || '',
      conjoint_date_naissance: dossier.conjoint_date_naissance || '',
      conjoint_categorie_professionnelle: dossier.conjoint_categorie_professionnelle || 0,
      conjoint_fumeur: dossier.conjoint_fumeur || false,
      conjoint_email: dossier.conjoint_email || '',
      conjoint_telephone: dossier.conjoint_telephone || '',
    });
  };

  /**
   * SUPPRESSION DU DOSSIER
   * Ouvre la modale de confirmation de suppression
   */
  const handleDeleteDossier = () => {
    setDeleteConfirmInput('');
    setShowDeleteModal(true);
  };

  /**
   * Confirme et exécute la suppression du dossier
   */
  const confirmDeleteDossier = async () => {
    if (deleteConfirmInput !== 'SUPPRIMER') {
      alert('Vous devez taper exactement "SUPPRIMER" pour confirmer.');
      return;
    }

    try {
      console.log(`[AdminDetail] Suppression du dossier ${dossierId}`);

      // Suppression via le service (cascade delete géré par la DB)
      await DossiersService.deleteDossier(dossierId);

      console.log(`[AdminDetail] ✅ Dossier ${dossierId} supprimé avec succès`);

      // Fermer la modale
      setShowDeleteModal(false);

      // Redirection vers la liste des dossiers
      router.push('/admin/dossiers');

    } catch (error: any) {
      console.error('[AdminDetail] ❌ Erreur lors de la suppression du dossier:', error);
      alert(`Erreur lors de la suppression du dossier : ${error?.message || 'Erreur inconnue'}`);
      setShowDeleteModal(false);
    }
  };

  /**
   * SAUVEGARDE DES DONNÉES DE PRÊT
   * 
   * Met à jour le JSON 'infos_pret' dans la table 'dossiers'
   * Recalcule automatiquement les économies pour tous les devis
   */
  const handleSavePretData = async () => {
    try {
      console.log('Sauvegarde des données prêt:', editedPretData);

      // Persistance pret_data par dossier_id
      const saved = await PretDataService.upsertByDossierId(dossierId, editedPretData as any);

      // Mettre à jour l'état local
      const savedAny = saved as any
      setDossier(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          infos_pret: {
            ...prev.infos_pret,
            banque_preteuse: savedAny.banque_preteuse,
            montant_capital: savedAny.montant_capital,
            duree_mois: savedAny.duree_mois,
            type_pret: savedAny.type_pret,
            type_pret_code: savedAny.type_pret_code || editedPretData.type_pret_code,
            objet_financement_code: savedAny.objet_financement_code || editedPretData.objet_financement_code,
            cout_assurance_banque: savedAny.cout_assurance_banque,
            frac_assurance: savedAny.frac_assurance || editedPretData.frac_assurance
          } as any
        };
      });

      setIsEditingPret(false);
    } catch (error) {
      console.error('Erreur sauvegarde données prêt:', error);
    }
  };

  // ============================================================================
  // SUPABASE INTEGRATION - GESTION DES DOCUMENTS
  // ============================================================================


  /**
   * AJOUT D'UN DOCUMENT
   * 
   * Upload vers Supabase Storage et création de l'entrée en base
   */
  const handleAddDocument = async (documentType: string, file: File) => {
    try {
      console.log('Ajout du document:', documentType, file.name);

      // SUPABASE: Upload et enregistrement
      /*
      const filePath = `${dossierId}/${documentType}/${file.name}`;
      
      // 1. Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Créer l'entrée en base
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          dossier_id: dossierId,
          type: documentType,
          nom: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: adminData.id
        });

      if (dbError) throw dbError;

      // 3. Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      */

      const newDocument = {
        nom: file.name,
        url: `/documents/${file.name}`,
        taille: `${(file.size / 1024 / 1024).toFixed(1)} MB`
      };

      setDossier(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: newDocument
          }
        };
      });

      setShowDocumentModal(false);
    } catch (error) {
      console.error('Erreur ajout document:', error);
    }
  };

  // ✅ MIGRATION COMPLÈTE - Utilisation de la source de vérité unique
  const getStatusBadge = (statusDisplay: string) => {
    // Reverse mapping: statut affichage → statut canonique
    const reversMap: Record<string, string> = {
      'nouveau': 'en_attente',
      'devis_envoye': 'devis_disponible',
      'valide': 'devis_accepte',
      'refuse': 'refuse',
      'finalise': 'finalise'
    };

    const statutCanonique = reversMap[statusDisplay] || statusDisplay;
    const config = getStatutBadgeConfig(statutCanonique);

    if (!config) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
          <i className="ri-time-line mr-2"></i>
          En cours
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <i className={`${config.icon} mr-2`}></i>
        {config.text}
      </span>
    );
  };

  // ✅ Utilisation des formatters centralisés depuis lib/utils/formatters.ts

  const calculateEconomie = (coutDevis: number, coutBanque?: number) => {
    if (!coutBanque || !dossier?.infos_pret?.duree_mois) return null;
    const economie = (coutBanque * dossier.infos_pret.duree_mois) - coutDevis;
    const pourcentage = ((economie / (coutBanque * dossier.infos_pret.duree_mois)) * 100);
    return { economie, pourcentage };
  };

  const handleDevisRowClick = (devis: Devis) => {
    setSelectedDevisDetail(devis);
    setShowDevisModal(true);
  };

  const handleChoisirDevis = async (devisId: string) => {
    // Note: La création de devis mock n'est plus nécessaire avec le nouveau système
    // Tous les devis sont désormais créés directement en base de données
    // Marquer visuellement le devis sélectionné immédiatement
    setDevis(prev => prev.map(d => ({ ...d, selected: d.id === devisId, refused: d.refused })) as any);
    setSelectedDevis(devisId);
    setShowConfirmModal(true);
  };

  // Fonction pour renvoyer un devis refusé
  const handleRenvoyerDevis = async (devisId: string) => {
    try {
      console.log('Renvoi du devis:', devisId);

      // Utiliser la fonction RPC atomique pour renvoyer le devis
      const { data: rpcResult, error: rpcError } = await supabase.rpc('envoyer_devis_selectionne', {
        p_devis_id: devisId,
        p_dossier_id: dossierId,
        p_admin_id: adminData.id
      });

      if (rpcError) {
        console.error('[AdminDetail] Erreur RPC renvoyer_devis_selectionne:', rpcError);
        throw rpcError;
      }

      console.log('[AdminDetail] Devis renvoyé avec succès:', rpcResult);

      // Mise à jour optimiste des états locaux
      setDevis(prev => prev.map(d => ({
        ...d,
        selected: d.id === devisId,
        refused: false,
        statut: d.id === devisId ? 'envoye' : d.statut
      })));

      setDossier(prev => {
        if (!prev) return prev;
        return { ...prev, status: 'devis_envoye' };
      });

      // Fermer la modale
      setShowDevisModal(false);

      alert('Devis renvoyé avec succès ! L\'apporteur recevra une notification.');

    } catch (error) {
      console.error('[AdminDetail] Erreur lors du renvoi du devis:', error);
      alert('Erreur lors du renvoi du devis. Veuillez réessayer.');
    }
  };

  // ============================================================================
  // FONCTIONS D'AJOUT DE DOCUMENTS
  // ============================================================================

  /**
   * Upload d'un nouveau document pour le dossier
   */
  const handleUploadDocument = async () => {
    if (!dossier) return;
    if (!newDocumentType || !newDocumentFile) {
      alert('Veuillez sélectionner un type de document et un fichier');
      return;
    }

    setIsUploadingDocument(true);

    try {
      console.log('[AdminDetail] Upload document:', {
        dossierId: dossier.id,
        type: newDocumentType,
        fileName: newDocumentFile.name,
        fileSize: newDocumentFile.size
      });

      // Créer un FormData pour l'upload
      const formData = new FormData();
      formData.append('dossierId', dossier.id);
      formData.append('documentType', newDocumentType);
      formData.append('file', newDocumentFile);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      console.log('[AdminDetail] Document uploadé avec succès:', result);

      // Recharger les documents du dossier
      await loadDossierData();

      // Fermer la modal et réinitialiser les états
      setShowDocumentModal(false);
      setNewDocumentType('');
      setNewDocumentFile(null);

      // Afficher un message de succès
      alert('Document ajouté avec succès !');

    } catch (error: any) {
      console.error('[AdminDetail] Erreur upload document:', error);
      alert(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setIsUploadingDocument(false);
    }
  };

  /**
   * Gestion du changement de fichier
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  /**
   * Validation et définition du fichier
   */
  const validateAndSetFile = (file: File) => {
    // Vérifier la taille du fichier (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. Taille maximum: 50MB');
      return;
    }

    setNewDocumentFile(file);
  };

  /**
   * Gestion du glisser-déposer
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  // Fonction pour relancer l'extraction de documents
  const handleRefreshExtraction = async () => {
    setIsExtracting(true);
    setExtractionError(null);

    try {
      console.log('[AdminDetail] Relance de l\'extraction pour le dossier:', dossierId);

      // Appel à l'API route d'extraction
      const response = await fetch('/api/extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dossierId }),
      });

      console.log('[AdminDetail] Réponse API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('[AdminDetail] Résultat API:', result);

      if (!response.ok) {
        throw new Error(result.error || `Erreur API ${response.status}: ${response.statusText}`);
      }

      if (result.success && result.data && result.data.pret) {
        // L'extraction est considérée comme réussie si on a au moins les données du prêt
        // Les calculs peuvent être null si le tableau d'amortissement est manquant
        const hasCalculs = result.data.calculs !== null;

        setExtractionResult({
          success: true,
          message: hasCalculs
            ? 'Données extraites automatiquement avec succès'
            : 'Données extraites partiellement (tableau d\'amortissement non trouvé)',
          confidence: result.data.metadata?.confidence || 0,
          warnings: result.data.metadata?.warnings || [],
          sourcesUtilisees: result.data.metadata?.sourcesUtilisees || []
        });

        // Recharger les données du dossier
        await loadExtractionData();

        console.log('[AdminDetail] Extraction réussie avec confidence:', result.data.metadata?.confidence);

        // Vérifier les différences dans les données client et proposer la mise à jour
        await checkDataDifferences(result.data);

        // Si pas de calculs, afficher un avertissement
        if (!hasCalculs) {
          console.warn('[AdminDetail] Calculs métier non disponibles - tableau d\'amortissement non trouvé');
        }
      } else {
        throw new Error('Données d\'extraction incomplètes - aucune information de prêt trouvée');
      }

    } catch (error: unknown) {
      console.error('[AdminDetail] Erreur lors de l\'extraction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'extraction';
      setExtractionError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  // Fonction pour comparer les données extraites avec les données actuelles
  const checkDataDifferences = async (extractedData: any) => {
    if (!dossier) return;
    try {
      if (!extractedData || !extractedData.emprunteurs) {
        console.log('[AdminDetail] Pas de données emprunteur à comparer');
        return;
      }

      // Construire l'objet ExtractedClientData
      const clientData: ExtractedClientData = {
        principal: {
          civilite: extractedData.emprunteurs.principal?.civilite || null,
          nom: extractedData.emprunteurs.principal?.nom || null,
          prenom: extractedData.emprunteurs.principal?.prenom || null,
          nomNaissance: extractedData.emprunteurs.principal?.nomNaissance || null,
          dateNaissance: extractedData.emprunteurs.principal?.dateNaissance || null,
          fumeur: extractedData.emprunteurs.principal?.fumeur || null,
          categorieProfessionnelle: extractedData.emprunteurs.principal?.categorieProfessionnelle || null,
          profession: extractedData.emprunteurs.principal?.profession || null,
          email: extractedData.emprunteurs.principal?.email || null,
          telephone: extractedData.emprunteurs.principal?.telephone || null,
        },
        conjoint: extractedData.emprunteurs.conjoint ? {
          civilite: extractedData.emprunteurs.conjoint.civilite || null,
          nom: extractedData.emprunteurs.conjoint.nom || null,
          prenom: extractedData.emprunteurs.conjoint.prenom || null,
          nomNaissance: extractedData.emprunteurs.conjoint.nomNaissance || null,
          dateNaissance: extractedData.emprunteurs.conjoint.dateNaissance || null,
          fumeur: extractedData.emprunteurs.conjoint.fumeur || null,
          categorieProfessionnelle: extractedData.emprunteurs.conjoint.categorieProfessionnelle || null,
          profession: extractedData.emprunteurs.conjoint.profession || null,
          email: extractedData.emprunteurs.conjoint.email || null,
          telephone: extractedData.emprunteurs.conjoint.telephone || null,
        } : null,
        nombreAssures: extractedData.nombreAssures || (extractedData.emprunteurs.conjoint ? 2 : 1),
        champsManquants: extractedData.metadata?.champsManquants || []
      };

      // Récupérer les données actuelles du dossier
      const currentData = {
        civilite: dossier.client_civilite,
        client_nom: dossier.client_nom,
        client_prenom: dossier.client_prenom,
        nom_naissance: dossier.client_nom_naissance,
        client_date_naissance: dossier.client_date_naissance,
        client_fumeur: dossier.client_fumeur,
        categorie_professionnelle: dossier.client_categorie_professionnelle,
        client_email: dossier.client_email,
        client_telephone: dossier.client_telephone,
        conjoint_civilite: dossier.conjoint_civilite,
        conjoint_nom: dossier.conjoint_nom,
        conjoint_prenom: dossier.conjoint_prenom,
        conjoint_nom_naissance: dossier.conjoint_nom_naissance,
        conjoint_date_naissance: dossier.conjoint_date_naissance,
        conjoint_fumeur: dossier.conjoint_fumeur,
        conjoint_categorie_professionnelle: dossier.conjoint_categorie_professionnelle,
        conjoint_email: dossier.conjoint_email,
        conjoint_telephone: dossier.conjoint_telephone,
      };

      // Générer le rapport de différences
      const report = DataComparisonService.generateDiffReport(
        currentData,
        clientData,
        dossier.is_couple
      );

      console.log('[AdminDetail] Rapport de comparaison:', report);

      // Si des différences sont détectées, afficher la modale
      if (report.hasClientDifferences || report.hasTypeMismatch) {
        setExtractedClientData(clientData);
        setDiffReport(report);
        setShowComparisonModal(true);
      }

    } catch (error) {
      console.error('[AdminDetail] Erreur lors de la comparaison:', error);
    }
  };

  // Fonction pour appliquer les changements sélectionnés
  const handleApplyDataChanges = async (selectedFields: string[], updateType: boolean) => {
    try {
      if (!extractedClientData) {
        console.error('[AdminDetail] Pas de données extraites disponibles');
        return;
      }

      console.log('═══════════════════════════════════════════');
      console.log('[AdminDetail] 🔄 DÉBUT APPLICATION CHANGEMENTS');
      console.log('[AdminDetail] Champs sélectionnés:', selectedFields);
      console.log('[AdminDetail] Mise à jour type dossier:', updateType);
      console.log('[AdminDetail] Données extraites:', extractedClientData);
      console.log('[AdminDetail] Dossier ID:', dossierId);

      // Construire le payload de mise à jour
      const payload = DataComparisonService.buildUpdatePayload(
        selectedFields,
        extractedClientData,
        dossierId
      );

      console.log('[AdminDetail] 📦 Payload construit:', JSON.stringify(payload, null, 2));
      console.log('[AdminDetail] Nombre de clés dans payload:', Object.keys(payload).length);

      // Mettre à jour les données client
      if (Object.keys(payload).length > 1) { // Plus que juste dossier_id
        console.log('[AdminDetail] ✅ Mise à jour des données client...');
        try {
          const result = await ClientInfosService.upsertClientInfo(payload);
          console.log('[AdminDetail] ✅ Données client mises à jour avec succès:', result);
        } catch (clientError: any) {
          console.error('[AdminDetail] ❌ ERREUR mise à jour client:', clientError);
          console.error('[AdminDetail] Message erreur:', clientError?.message);
          console.error('[AdminDetail] Détails erreur:', clientError);
          throw new Error(`Erreur mise à jour client: ${clientError?.message || 'Inconnue'}`);
        }
      } else {
        console.log('[AdminDetail] ⏭️ Pas de données client à mettre à jour');
      }

      // Changer le type de dossier si demandé
      if (updateType && diffReport) {
        console.log('[AdminDetail] 🔄 Changement type dossier vers:', diffReport.detectedType);
        try {
          await DossiersService.changeDossierType(dossierId, diffReport.detectedType);
          console.log('[AdminDetail] ✅ Type de dossier changé avec succès');
        } catch (typeError: any) {
          console.error('[AdminDetail] ❌ ERREUR changement type:', typeError);
          console.error('[AdminDetail] Message erreur:', typeError?.message);
          console.error('[AdminDetail] Détails erreur:', typeError);
          throw new Error(`Erreur changement type: ${typeError?.message || 'Inconnue'}`);
        }
      } else {
        console.log('[AdminDetail] ⏭️ Pas de changement de type');
      }

      // Recharger les données
      console.log('[AdminDetail] 🔄 Rechargement des données...');
      await loadDossierData();
      console.log('[AdminDetail] ✅ Données rechargées');

      // Fermer la modale
      setShowComparisonModal(false);
      setDiffReport(null);
      setExtractedClientData(null);

      console.log('[AdminDetail] ✅ FIN APPLICATION CHANGEMENTS - SUCCÈS');
      console.log('═══════════════════════════════════════════');

      alert('Modifications appliquées avec succès !');

    } catch (error: any) {
      console.error('═══════════════════════════════════════════');
      console.error('[AdminDetail] ❌ ERREUR LORS DE L\'APPLICATION DES CHANGEMENTS');
      console.error('[AdminDetail] Type erreur:', typeof error);
      console.error('[AdminDetail] Message:', error?.message);
      console.error('[AdminDetail] Stack:', error?.stack);
      console.error('[AdminDetail] Objet complet:', error);
      console.error('═══════════════════════════════════════════');
      throw error;
    }
  };

  // Fonction pour actualiser les devis
  const handleRefreshDevis = async () => {
    if (!dossier) return;
    setIsRefreshingDevis(true);

    try {
      console.log('[AdminDetail] Actualisation des devis pour le dossier:', dossierId);

      // Appel à l'API Exade avec les données extraites
      const response = await fetch('/api/exade/tarifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: currentBrokerId,
          clientInfo: dossier,
          pretData: dossier.infos_pret
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Erreur lors de la génération des devis');
      }

      const tarifs: any[] = payload?.tarifs || [];

      if (tarifs.length > 0) {
        // Supprimer les anciens devis
        await supabase
          .from('devis')
          .delete()
          .eq('dossier_id', dossierId);

        // Créer les nouveaux devis
        const devisToInsert = tarifs.map((t: any, index: number) => ({
          dossier_id: dossierId,
          numero_devis: `EX-${Date.now()}-${index + 1}`,
          statut: 'en_attente',
          donnees_devis: t,
          date_generation: new Date().toISOString(),
          date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        await DevisService.createMultipleDevis(devisToInsert as any);

        // Recharger les devis
        await loadDossierData();

        console.log('[AdminDetail] Devis actualisés avec succès');
      } else {
        console.warn('[AdminDetail] Aucun devis généré');
      }

    } catch (error) {
      console.error('[AdminDetail] Erreur lors de l\'actualisation des devis:', error);
      alert('Erreur lors de l\'actualisation des devis. Veuillez réessayer.');
    } finally {
      setIsRefreshingDevis(false);
    }
  };

  // Fonction pour charger les données d'extraction
  const loadExtractionData = async () => {
    try {
      // Charger les données de prêt depuis la base de données
      const { data: pretData, error } = await supabase
        .from('pret_data')
        .select('*')
        .eq('dossier_id', dossierId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('[AdminDetail] Erreur chargement pret_data:', error);
        return;
      }

      if (pretData) {
        // Mettre à jour les informations du prêt avec les données extraites
        setDossier(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            infos_pret: {
              ...prev.infos_pret,
              banque_preteuse: pretData.banque_preteuse || prev.infos_pret?.banque_preteuse || '',
              montant_capital: pretData.montant_capital || prev.infos_pret?.montant_capital || 0,
              duree_mois: pretData.duree_mois || prev.infos_pret?.duree_mois || 0,
              type_pret: pretData.type_pret || prev.infos_pret?.type_pret || '',
              type_pret_code: pretData.type_pret_code || prev.infos_pret?.type_pret_code || 1,
              objet_financement_code: pretData.objet_financement_code || prev.infos_pret?.objet_financement_code || 1,
              cout_assurance_banque: pretData.cout_assurance_banque || prev.infos_pret?.cout_assurance_banque || null,
              // Données supplémentaires extraites par l'IA
              date_debut: pretData.date_debut,
              date_fin: pretData.date_fin,
              taux_nominal: pretData.taux_nominal,
              date_debut_effective: pretData.date_debut_effective,
              duree_restante_mois: pretData.duree_restante_mois,
              capital_restant_du: pretData.capital_restant_du
            }
          };
        });

        // Charger les activités d'extraction pour afficher le statut
        const { data: activities } = await supabase
          .from('activities')
          .select('*')
          .eq('dossier_id', dossierId)
          .in('activity_type', ['extraction_automatique', 'extraction_echouee'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (activities && activities.length > 0) {
          const lastActivity = activities[0];
          if (lastActivity.activity_type === 'extraction_automatique') {
            setExtractionResult({
              success: true,
              message: lastActivity.activity_description,
              confidence: lastActivity.activity_data?.confidence || 0.8,
              warnings: lastActivity.activity_data?.warnings || [],
              sourcesUtilisees: lastActivity.activity_data?.sources_utilisees || []
            });
          } else if (lastActivity.activity_type === 'extraction_echouee') {
            setExtractionError(lastActivity.activity_data?.error || 'Extraction automatique échouée');
          }
        }
      }
    } catch (error) {
      console.error('[AdminDetail] Erreur chargement données extraction:', error);
    }
  };

  // ============================================================================
  // SUPABASE INTEGRATION - WORKFLOW COMPLET DE GESTION DES DEVIS
  // ============================================================================

  /**
   * FONCTION CRITIQUE : ENVOI D'UN DEVIS SÉLECTIONNÉ
   * 
   * Cette fonction orchestre le workflow complet :
   * 1. Marque le devis comme sélectionné (selected = true)
   * 2. Démarque tous les autres devis du dossier (selected = false)
   * 3. Change le statut du dossier : 'nouveau' -> 'devis_envoye'
   * 4. Met à jour les étapes de processus
   * 5. Crée une notification pour l'apporteur
   * 6. Envoie un email automatique
   * 7. Synchronise toutes les interfaces en temps réel
   * 
   * Après cette action :
   * - Le devis apparaît dans la vue d'ensemble admin
   * - L'apporteur reçoit une notification
   * - L'interface apporteur affiche le devis pour validation client
   * - Le client peut valider ou refuser via l'apporteur
   */
  const confirmEnvoiDevis = async () => {
    try {
      console.log('Envoi du devis sélectionné:', selectedDevis);

      // Utiliser la fonction RPC atomique pour l'envoi de devis
      const { data: rpcResult, error: rpcError } = await supabase.rpc('envoyer_devis_selectionne', {
        p_devis_id: selectedDevis,
        p_dossier_id: dossierId,
        p_admin_id: adminData.id
      });

      if (rpcError) {
        console.error('[AdminDetail] Erreur RPC envoyer_devis_selectionne:', rpcError);
        throw rpcError;
      }

      console.log('[AdminDetail] Devis envoyé avec succès:', rpcResult);

      // Mise à jour optimiste des états locaux
      setDevis(prev => prev.map(d => ({
        ...d,
        selected: d.id === selectedDevis,
        refused: false,
        statut: d.id === selectedDevis ? 'envoye' : d.statut
      })));

      setDossier(prev => {
        if (!prev) return prev;
        return { ...prev, status: 'devis_envoye' };
      });

      // Refetch dossier + devis pour aligner l'état (selected via devis_selectionne_id)
      try {
        const refreshed = await DossiersService.getDossierById(dossierId);
        const selectedId = refreshed?.devis_selectionne_id || null;
        const freshDevis = (refreshed?.devis || []).map((d: any) => ({
          ...d,
          selected: selectedId ? d.id === selectedId : false,
          refused: d.statut === 'refuse',
        }));
        setDossier(prev => {
          if (!prev) return prev;
          return { ...prev, status: 'devis_envoye' };
        });
        setDevis(freshDevis);
      } catch (e) {
        console.warn('[AdminDetail] refetch après envoi devis échoué', e);
      }

      setShowConfirmModal(false);
      setSelectedDevis(null);

      console.log('✅ Devis envoyé avec succès - L\'apporteur va recevoir une notification');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du devis:', error);
      alert('Erreur lors de l\'envoi du devis');
    }
  };

  const handleFinaliser = () => {
    setShowFinalizeModal(true);
  };

  /**
   * FINALISATION D'UN DOSSIER VALIDÉ
   * 
   * Cette fonction marque le dossier comme terminé :
   * 1. Change le statut : 'valide' -> 'finalise'
   * 2. Enregistre la date de finalisation
   * 3. Débloque la saisie des frais de gestion pour l'apporteur
   * 4. Archive les documents si nécessaire
   * 5. Crée les notifications finales
   * 
   * Cette action n'est possible qu'après validation client/apporteur
   */
  const confirmFinalisation = async () => {
    if (!dossier) return;
    try {
      console.log('Finalisation du dossier:', dossier.id);

      // Persistance: statut finalisé côté DB
      await DossiersService.updateDossier(dossierId, { statut: 'finalise' as any });

      // Créer une activité pour l'apporteur
      if (dossier.apporteur_id) {
        await supabase
          .from('activities')
          .insert({
            user_id: dossier.apporteur_id,
            dossier_id: dossierId,
            activity_type: 'dossier_finalise',
            activity_title: 'Dossier finalisé',
            activity_description: `Le dossier ${dossier.numero_dossier} a été finalisé avec succès.`,
            activity_data: {
              dossier_id: dossierId,
              numero_dossier: dossier.numero_dossier,
              action: 'dossier_finalise'
            }
          });
      }

      // Créer une notification pour l'apporteur
      if (dossier.apporteur_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: dossier.apporteur_id,
            title: 'Dossier finalisé avec succès',
            message: `Félicitations ! Votre dossier ${dossier.numero_dossier} a été finalisé avec succès.`,
            type: 'success',
            data: { dossier_id: dossierId }
          });
      }

      // Mise à jour locale
      setDossier(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'finalise',
          date_finalisation: new Date().toISOString()
        };
      });

      setShowFinalizeModal(false);
      console.log('✅ Dossier finalisé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la finalisation:', error);
      alert('Erreur lors de la finalisation');
    }
  };

  const handleDownloadDocument = (url: string, nom: string) => {
    console.log('Téléchargement du document:', nom);
    window.open(url, '_blank');
  };

  // State pour le visualiseur de documents
  const [showDocModal, setShowDocModal] = useState(false);
  const [currentDocUrl, setCurrentDocUrl] = useState<string | null>(null);
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const handleViewDocument = (url: string, title: string = 'Document', type: string = '', id: string | null = null) => {
    console.log('Visualisation du document:', { url, title, type, id });
    setCurrentDocUrl(url);
    setCurrentDocTitle(title);
    setCurrentDocType(type);
    setCurrentDocId(id);
    setShowDocModal(true);
  };

  /**
   * Suppression d'un document
   */
  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    try {
      console.log('[AdminDetail] Suppression du document:', documentId);

      const response = await fetch(`/api/documents/delete?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      const result = await response.json();
      console.log('[AdminDetail] Document supprimé:', result);

      // Fermer la modale
      setShowDeleteDocModal(false);
      setDocumentToDelete(null);

      // Recharger les données du dossier
      await loadDossierData();

      // Afficher un message de succès
      alert('Document supprimé avec succès');

    } catch (error: unknown) {
      console.error('[AdminDetail] Erreur suppression document:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la suppression: ${errorMsg}`);
    }
  };

  /**
   * Ouvrir la modale de suppression
   */
  const openDeleteModal = (documentId: string, documentName: string) => {
    setDocumentToDelete(documentId);
    setShowDeleteDocModal(true);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    );
  }

  // Guard clause - TypeScript sait maintenant que dossier n'est pas null après ce point
  if (!dossier) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400">Dossier non trouvé</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-[#335FAD] text-white rounded-lg hover:bg-[#2a4d8a] transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header - SANS AdminHeader */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">
                  Dossier <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">{dossier.numero_dossier}</span>
                </h1>
                {/* BADGE STATUT - Synchronisé en temps réel avec Supabase */}
                {getStatusBadge(dossier.status)}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {dossier.client_prenom} {dossier.client_nom} • Géré par {dossier.apporteur_prenom} {dossier.apporteur_nom}
              </p>
            </div>
          </div>

          {/* Navigation tabs avec scroll horizontal responsive */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'overview'
                  ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Vue d&apos;ensemble
              </button>
              <button
                onClick={() => setActiveTab('client')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'client'
                  ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Données client
              </button>
              <button
                onClick={() => setActiveTab('pret')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'pret'
                  ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Infos du prêt
              </button>
              <button
                onClick={() => setActiveTab('devis')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'devis'
                  ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Devis comparatif
              </button>
              <button
                onClick={() => setActiveTab('reglages')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'reglages'
                  ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Réglages
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* Détails du dossier */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Détails du dossier
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Type de dossier
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {dossier.is_couple ? 'Couple' : 'Seul'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Type d'assurance
                    </label>
                    <p className="text-gray-900 dark:text-white">{dossier.type_assurance}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Montant du capital
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(dossier.montant_capital)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Durée du prêt
                    </label>
                    <p className="text-gray-900 dark:text-white">{dossier.duree_pret} ans</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date de soumission
                    </label>
                    <p className="text-gray-900 dark:text-white">{formatDate(dossier.date_soumission)}</p>
                  </div>
                </div>
              </div>

              {/* Card de recommandation commission (mode compact) */}
              {dossier.status === 'nouveau' || dossier.status === 'devis_disponible' ? (
                <CommissionRecommendationCard
                  dossierId={dossierId}
                  coutAssuranceBanque={dossier.infos_pret?.cout_assurance_banque || dossier.cout_assurance_banque}
                  compact={true}
                />
              ) : null}

              {/* ============================================================================ */}
              {/* SECTION CRITIQUE : DEVIS SÉLECTIONNÉ - TRAÇABILITÉ COMPLÈTE */}
              {/* ============================================================================ */}

              {/* 
              FONCTIONNEMENT COMPLET DE CETTE SECTION :
              
              1. SÉLECTION ADMIN (statut: nouveau -> devis_envoye)
                 - Admin sélectionne un devis via confirmEnvoiDevis()
                 - DB: UPDATE devis SET selected = true WHERE id = devisId
                 - DB: UPDATE dossiers SET status = 'devis_envoye'
                 - Cette card devient visible immédiatement
                 - Notification envoyée à l'apporteur
              
              2. VALIDATION CLIENT/APPORTEUR (statut: devis_envoye -> valide)
                 - Client valide via interface apporteur
                 - DB: UPDATE dossiers SET status = 'valide', date_validation = NOW()
                 - Card reste visible avec thème vert
                 - Bouton "Marquer comme finalisé" apparaît
              
              3. REFUS CLIENT/APPORTEUR (statut: devis_envoye -> refuse)
                 - Client refuse via interface apporteur
                 - DB: UPDATE dossiers SET status = 'refuse', commentaire_refus = '...'
                 - Card reste visible avec thème rouge
                 - Bouton "Changer le devis" permet de sélectionner un autre devis
              
              4. FINALISATION ADMIN (statut: valide -> finalise)
                 - Admin finalise via confirmFinalisation()
                 - DB: UPDATE dossiers SET status = 'finalise', date_finalisation = NOW()
                 - Card reste visible avec thème violet
                 - Processus terminé, traçabilité complète conservée
              
              La card reste TOUJOURS visible une fois un devis sélectionné,
              permettant de voir en permanence quel devis a été choisi,
              même après finalisation du dossier.
              */}
              {(dossier.status === 'devis_envoye' || dossier.status === 'valide' || dossier.status === 'refuse' || dossier.status === 'finalise') && devis.find(d => d.selected) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                      <i className="ri-check-line text-green-500 mr-2"></i>
                      Devis sélectionné
                    </h3>
                    <button
                      onClick={() => setActiveTab('devis')}
                      className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 text-sm font-medium cursor-pointer"
                    >
                      Voir tous les devis
                    </button>
                  </div>

                  {(() => {
                    const selectedDevis = devis.find(d => d.selected);
                    if (!selectedDevis) return null;

                    const economieCalculee = calculateEconomie(selectedDevis.cout_total, dossier.infos_pret.cout_assurance_banque);

                    // THEMING DYNAMIQUE SELON LE STATUT - Reflète l'état du workflow
                    const getDevisTheme = () => {
                      if (dossier.status === 'refuse') {
                        return {
                          bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
                          badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                          badgeText: 'Devis refusé par le client',
                          titleClass: 'text-red-900 dark:text-red-200',
                          subtitleClass: 'text-red-700 dark:text-red-300',
                          labelClass: 'text-red-600 dark:text-red-400',
                          valueClass: 'text-red-900 dark:text-red-200',
                          borderColor: 'border-red-200 dark:border-red-700'
                        };
                      } else if (dossier.status === 'finalise') {
                        return {
                          bgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                          badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                          badgeText: 'Contrat finalisé',
                          titleClass: 'text-purple-900 dark:text-purple-200',
                          subtitleClass: 'text-purple-700 dark:text-purple-300',
                          labelClass: 'text-purple-600 dark:text-purple-400',
                          valueClass: 'text-purple-900 dark:text-purple-200',
                          borderColor: 'border-purple-200 dark:border-purple-700'
                        };
                      } else {
                        return {
                          bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                          badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                          badgeText: 'Devis sélectionné',
                          titleClass: 'text-green-900 dark:text-green-200',
                          subtitleClass: 'text-green-700 dark:text-green-300',
                          labelClass: 'text-green-600 dark:text-green-400',
                          valueClass: 'text-green-900 dark:text-green-200',
                          borderColor: 'border-green-200 dark:border-green-700'
                        };
                      }
                    };

                    const theme = getDevisTheme();

                    return (
                      <div className={`${theme.bgClass} border rounded-lg p-4`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className={`text-lg font-medium ${theme.titleClass}`}>
                              {selectedDevis.compagnie}
                            </h4>
                            <p className={`text-sm ${theme.subtitleClass}`}>
                              {selectedDevis.produit}
                            </p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${theme.badgeClass}`}>
                              {theme.badgeText}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDevisRowClick(selectedDevis)}
                            className={`${theme.labelClass} hover:opacity-75 text-sm font-medium cursor-pointer`}
                          >
                            Voir détails
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className={`block text-xs font-medium ${theme.labelClass} mb-1`}>
                              Coût mensuel
                            </label>
                            <p className={`${theme.valueClass} font-medium`}>
                              {formatCurrency(selectedDevis.cout_mensuel)}
                            </p>
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${theme.labelClass} mb-1`}>
                              Coût total
                            </label>
                            <p className={`${theme.valueClass} font-medium`}>
                              {formatCurrency(selectedDevis.cout_total)}
                            </p>
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${theme.labelClass} mb-1`}>
                              Économie Estimée
                            </label>
                            <p className={`font-medium ${(economieCalculee?.economie || selectedDevis.economie_estimee || 0) > 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                              }`}>
                              {formatCurrency(economieCalculee?.economie || selectedDevis.economie_estimee || 0)}
                              {economieCalculee && (
                                <span className="text-xs ml-1">
                                  ({economieCalculee.pourcentage.toFixed(1)}%)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Motif de refus quand refusé */}
                        {dossier.status === 'refuse' && (
                          <div className={`mt-3 pt-3 border-t ${theme.borderColor}`}>
                            <label className={`block text-xs font-medium ${theme.labelClass} mb-1`}>
                              Motif du refus
                            </label>
                            <p className={`text-sm ${theme.valueClass}`}>
                              {selectedDevis.motif_refus
                                || (selectedDevis as any)?.commentaire_refus
                                || (selectedDevis as any)?.donnees_devis?.motif_refus
                                || (dossier as any)?.commentaire
                                || (dossier as any)?.commentaire_refus
                                || '—'}
                            </p>
                          </div>
                        )}

                        <div className={`mt-3 pt-3 border-t ${theme.borderColor}`}>
                          <label className={`block text-xs font-medium ${theme.labelClass} mb-1`}>
                            Formalités médicales
                          </label>
                          <p className={`text-sm ${theme.valueClass}`}>
                            {(selectedDevis.formalites_medicales || []).join(', ')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Commentaire de l'apporteur */}
              {dossier.commentaire_apporteur && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Commentaire de l'apporteur
                  </h3>
                  <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/80 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <i className="ri-chat-quote-line text-[#335FAD] dark:text-[#335FAD] text-xl mt-0.5"></i>
                      <div>
                        <p className="text-[#335FAD] dark:text-[#335FAD]/80 leading-relaxed">
                          {dossier.commentaire_apporteur}
                        </p>
                        <p className="text-[#335FAD] dark:text-[#335FAD] text-sm mt-2">
                          — {dossier.apporteur_prenom} {dossier.apporteur_nom}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================================ */}
              {/* WORKFLOW COMPLET - ACTIONS SELON LE STATUT DU DOSSIER */}
              {/* ============================================================================ */}

              {/* STATUT: NOUVEAU - Dossier vient d'arriver, admin doit sélectionner un devis */}
              {dossier.status === 'nouveau' && (
                <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-xl border border-[#335FAD]/20 dark:border-[#335FAD]/80 p-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-information-line text-[#335FAD] dark:text-[#335FAD] text-xl mt-0.5"></i>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-[#335FAD] dark:text-[#335FAD]/80 mb-2">
                        Nouveau dossier à traiter
                      </h4>
                      <p className="text-[#335FAD]/80 dark:text-[#335FAD]/80 mb-4">
                        Ce dossier est en attente de validation. Vérifiez les données et l'analyse IA, puis consultez les devis pour sélectionner la meilleure offre.
                      </p>
                      <button
                        onClick={() => setActiveTab('devis')}
                        className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Voir les devis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUT: DEVIS ENVOYÉ - Devis sélectionné et envoyé à l'apporteur */}
              {(dossier.status === 'devis_envoye' || (dossier.status as any) === 'devis_disponible') && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-send-plane-line text-orange-600 dark:text-orange-400 text-xl mt-0.5"></i>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-orange-900 dark:text-orange-200 mb-2">
                        Devis envoyé à l&apos;apporteur
                      </h4>
                      <p className="text-orange-700 dark:text-orange-300 mb-4">
                        Le devis sélectionné a été envoyé à l'apporteur. En attente de la réponse du client.
                      </p>
                      {/* Afficher le devis envoyé */}
                      {Array.isArray(devis) && devis.some((d: any) => d.statut === 'envoye') && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700 mb-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Devis envoyé :</p>
                          <div className="divide-y divide-orange-100 dark:divide-orange-800">
                            {devis.filter((d: any) => d.statut === 'envoye').map((d: any) => (
                              <div
                                key={d.id}
                                className="py-2 cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-900/10 rounded px-2"
                                onClick={() => handleDevisRowClick(d as any)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                      {d.numero_devis || d.id}
                                    </p>
                                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                      Envoyé le {d.date_envoi && formatDate(d.date_envoi)}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      Compagnie: {(d.donnees_devis as any)?.compagnie || 'Assureur'}
                                    </p>
                                  </div>
                                  <span className="text-xs text-orange-600 dark:text-orange-400">Voir détails</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STATUT: VALIDÉ - L'apporteur/client a accepté, admin peut finaliser */}
              {dossier.status === 'valide' && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <i className="ri-check-line text-green-600 dark:text-green-400 text-xl mt-0.5"></i>
                      <div>
                        <h4 className="text-lg font-medium text-green-900 dark:text-green-200 mb-2">
                          Dossier validé par l&apos;apporteur
                        </h4>
                        <p className="text-green-700 dark:text-green-300">
                          Validé le {dossier.date_validation && formatDate(dossier.date_validation)}
                        </p>
                        {Array.isArray(devis) && devis.some((d: any) => d.statut === 'accepte') && (
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700 mt-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Devis validé :</p>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                              {devis.filter((d: any) => d.statut === 'accepte').map((d: any) => (
                                <li key={d.id} className="cursor-pointer" onClick={() => handleDevisRowClick(d as any)}>
                                  {d.numero_devis || d.id}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleFinaliser}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Marquer comme finalisé
                    </button>
                  </div>
                </div>
              )}

              {/* STATUT: REFUSÉ - L'apporteur/client a refusé, possibilité de changer de devis */}
              {dossier.status === 'refuse' && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-close-line text-red-600 dark:text-red-400 text-xl mt-0.5"></i>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
                        Dossier refusé par l&apos;apporteur
                      </h4>
                      <p className="text-red-700 dark:text-red-300 mb-2">
                        Refusé le {dossier.date_refus && formatDate(dossier.date_refus)}
                      </p>
                      {/* Lister les devis refusés */}
                      {Array.isArray(devis) && devis.some((d: any) => d.statut === 'refuse') && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700 mb-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Devis refusé(s) :</p>
                          <div className="divide-y divide-red-100 dark:divide-red-800">
                            {devis.filter((d: any) => d.statut === 'refuse').map((d: any) => (
                              <div
                                key={d.id}
                                className="py-2 cursor-pointer hover:bg-red-50/60 dark:hover:bg-red-900/10 rounded px-2"
                                onClick={() => handleDevisRowClick(d as any)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                      {d.numero_devis || d.id}
                                    </p>
                                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                      motif : {d.motif_refus
                                        || (d as any)?.donnees_devis?.motif_refus
                                        || (d as any)?.commentaire_refus
                                        || (dossier as any)?.commentaire
                                        || (dossier as any)?.commentaire_refus
                                        || '—'}
                                    </p>
                                  </div>
                                  <span className="text-xs text-red-600 dark:text-red-400">Voir détails</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* BOUTON CRITIQUE: Permet de sélectionner un autre devis après refus */}
                      <button
                        onClick={() => setActiveTab('devis')}
                        className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-refresh-line mr-2"></i>
                        Changer le devis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUT: FINALISÉ - Processus terminé, traçabilité complète */}
              {dossier.status === 'finalise' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-checkbox-circle-line text-purple-600 dark:text-purple-400 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="text-lg font-medium text-purple-900 dark:text-purple-200 mb-2">
                        Dossier finalisé
                      </h4>
                      <p className="text-purple-700 dark:text-purple-300">
                        Finalisé le {dossier.date_finalisation && formatDate(dossier.date_finalisation)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Informations client */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informations client
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom complet
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {dossier.client_civilite || ''} {dossier.client_prenom} {dossier.client_nom}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{dossier.client_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Téléphone
                    </label>
                    <p className="text-gray-900 dark:text-white">{dossier.client_telephone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date de naissance
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(dossier.client_date_naissance).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations conjoint (si dossier couple) */}
              {dossier.is_couple && (dossier.conjoint_nom || dossier.conjoint_prenom) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Informations conjoint
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Nom complet
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {dossier.conjoint_civilite || ''} {dossier.conjoint_prenom} {dossier.conjoint_nom}
                      </p>
                    </div>
                    {dossier.conjoint_email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Email
                        </label>
                        <p className="text-gray-900 dark:text-white">{dossier.conjoint_email}</p>
                      </div>
                    )}
                    {dossier.conjoint_telephone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Téléphone
                        </label>
                        <p className="text-gray-900 dark:text-white">{dossier.conjoint_telephone}</p>
                      </div>
                    )}
                    {dossier.conjoint_date_naissance && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Date de naissance
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {new Date(dossier.conjoint_date_naissance).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                    {(dossier.conjoint_categorie_professionnelle !== null && dossier.conjoint_categorie_professionnelle !== undefined && dossier.conjoint_categorie_professionnelle > 0) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Catégorie professionnelle
                        </label>
                        <p className="text-gray-900 dark:text-white">{getCategoryLabel(dossier.conjoint_categorie_professionnelle)}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Fumeur
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {dossier.conjoint_fumeur ? 'Oui' : 'Non'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Informations apporteur */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Apporteur d'affaires
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom complet
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {dossier.apporteur_prenom} {dossier.apporteur_nom}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{dossier.apporteur_email}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/admin/apporteurs/${dossier.apporteur_id}`)}
                    className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Voir le profil complet
                  </button>
                </div>
              </div>

              {/* Historique des devis */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  <i className="ri-history-line mr-2"></i>
                  Historique des devis
                </h3>

                {devisHistory && devisHistory.length > 0 ? (
                  <div className="space-y-3">
                    {devisHistory.map((d, index) => (
                      <div
                        key={`${d.devis_id}-${d.action_type}-${index}`}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${d.action_type === 'accepte'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          : d.action_type === 'renvoye'
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                            : d.action_type === 'refuse'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        onClick={() => {
                          // Trouver le devis correspondant dans la liste des devis pour la modale
                          const devisForModal = devis.find(devisItem => devisItem.id === d.devis_id);
                          if (devisForModal) {
                            setSelectedDevisDetail(devisForModal);
                            setShowDevisModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${d.action_type === 'accepte'
                              ? 'bg-green-500'
                              : d.action_type === 'renvoye'
                                ? 'bg-orange-500'
                                : d.action_type === 'refuse'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`}></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {d.compagnie} - {d.numero_devis}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(d.cout_mensuel)}/mois • {formatCurrency(d.cout_total)} total
                              </p>
                              {d.action_date && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {d.action_type === 'renvoye' ? 'Renvoyé le' :
                                    d.action_type === 'refuse' ? 'Refusé le' :
                                      d.action_type === 'accepte' ? 'Accepté le' : 'Le'} {formatDate(d.action_date)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {d.action_type === 'accepte' && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                                Accepté
                              </span>
                            )}
                            {d.action_type === 'renvoye' && (
                              <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-full text-xs font-medium">
                                Renvoyé
                              </span>
                            )}
                            {d.action_type === 'refuse' && (
                              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-full text-xs font-medium">
                                Refusé
                              </span>
                            )}
                            <i className="ri-arrow-right-s-line text-gray-400"></i>
                          </div>
                        </div>

                        {/* Affichage du motif de refus si le devis est refusé */}
                        {d.action_type === 'refuse' && d.motif_refus && (
                          <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <span className="font-medium">motif :</span> {d.motif_refus}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="ri-file-list-3-line text-gray-400 text-3xl mb-3"></i>
                    <p className="text-gray-500 dark:text-gray-400">Aucun devis généré pour ce dossier</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'client' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Données client - Issues du formulaire et de l'IA
                </h3>

                {/* Desktop - bouton à côté du titre */}
                <div className="hidden sm:flex">
                  {!isEditingClient ? (
                    <button
                      onClick={handleStartEditClient}
                      className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <i className="ri-edit-line mr-2"></i>
                      Modifier
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveClientData}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-save-line mr-2"></i>
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setIsEditingClient(false)}
                        className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Civilité
                  </label>
                  {isEditingClient ? (
                    <Select
                      value={editedClientData.client_civilite || ''}
                      onValueChange={(v) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_civilite: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">M.</SelectItem>
                        <SelectItem value="Mme">Mme</SelectItem>
                        <SelectItem value="Mlle">Mlle</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_civilite || '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Prénom
                  </label>
                  {isEditingClient ? (
                    <input
                      type="text"
                      value={editedClientData.client_prenom}
                      onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_prenom: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_prenom}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Nom
                  </label>
                  {isEditingClient ? (
                    <input
                      type="text"
                      value={editedClientData.client_nom}
                      onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_nom: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_nom}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Date de naissance
                  </label>
                  {isEditingClient ? (
                    <DatePicker
                      value={editedClientData.client_date_naissance}
                      onChange={(value) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_date_naissance: value }))}
                      placeholder="Sélectionner une date de naissance"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {new Date(dossier.client_date_naissance).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Statut fumeur
                  </label>
                  {isEditingClient ? (
                    <Select
                      value={editedClientData.client_fumeur ? 'true' : 'false'}
                      onValueChange={(v) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_fumeur: v === 'true' }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Non-fumeur</SelectItem>
                        <SelectItem value="true">Fumeur</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_fumeur ? 'Fumeur' : 'Non-fumeur'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Catégorie professionnelle
                  </label>
                  {isEditingClient ? (
                    <Select
                      value={String(editedClientData.client_categorie_professionnelle || 0)}
                      onValueChange={(v) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_categorie_professionnelle: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {getCategoryLabel(dossier.client_categorie_professionnelle)}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Adresse
                  </label>
                  {isEditingClient ? (
                    <input
                      type="text"
                      value={editedClientData.client_adresse}
                      onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_adresse: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_adresse}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Email
                  </label>
                  {isEditingClient ? (
                    <input
                      type="email"
                      value={editedClientData.client_email}
                      onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_email: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Téléphone
                  </label>
                  {isEditingClient ? (
                    <input
                      type="tel"
                      value={editedClientData.client_telephone}
                      onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_telephone: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {dossier.client_telephone}
                    </p>
                  )}
                </div>

              </div>

              {/* Mobile - bouton en bas à droite */}
              <div className="sm:hidden mt-6 flex justify-end">
                {!isEditingClient ? (
                  <button
                    onClick={handleStartEditClient}
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <i className="ri-edit-line mr-2"></i>
                    Modifier
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveClientData}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <i className="ri-save-line mr-2"></i>
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setIsEditingClient(false)}
                      className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Card Informations du conjoint (si dossier couple) */}
            {dossier.type === 'couple' && (dossier.conjoint_nom || dossier.conjoint_prenom) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Informations du conjoint
                  </h3>

                  {/* Desktop - bouton à côté du titre */}
                  <div className="hidden sm:flex">
                    {!isEditingClient ? (
                      <button
                        onClick={handleStartEditClient}
                        className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-edit-line mr-2"></i>
                        Modifier
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveClientData}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                          <i className="ri-save-line mr-2"></i>
                          Sauvegarder
                        </button>
                        <button
                          onClick={handleCancelEditClient}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                          <i className="ri-close-line mr-2"></i>
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile - bouton sous le titre */}
                <div className="sm:hidden mb-6">
                  {!isEditingClient ? (
                    <button
                      onClick={handleStartEditClient}
                      className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <i className="ri-edit-line mr-2"></i>
                      Modifier
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveClientData}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-save-line mr-2"></i>
                        Sauvegarder
                      </button>
                      <button
                        onClick={handleCancelEditClient}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-close-line mr-2"></i>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Civilité du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Civilité du conjoint
                    </label>
                    {isEditingClient ? (
                      <Select
                        value={editedClientData.conjoint_civilite || ''}
                        onValueChange={(v) => setEditedClientData((prev: EditedClientData) => ({ ...prev, conjoint_civilite: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">M.</SelectItem>
                          <SelectItem value="Mme">Mme</SelectItem>
                          <SelectItem value="Mlle">Mlle</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {dossier.conjoint_civilite || '-'}
                      </p>
                    )}
                  </div>

                  {/* Nom du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Nom du conjoint
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientData.conjoint_nom}
                        onChange={(e) => setEditedClientData(prev => ({ ...prev, conjoint_nom: e.target.value }))}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_nom || 'Non renseigné'}</p>
                    )}
                  </div>

                  {/* Prénom du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Prénom du conjoint
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientData.conjoint_prenom}
                        onChange={(e) => setEditedClientData(prev => ({ ...prev, conjoint_prenom: e.target.value }))}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_prenom || 'Non renseigné'}</p>
                    )}
                  </div>

                  {/* Date de naissance du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Date de naissance du conjoint
                    </label>
                    {isEditingClient ? (
                      <DatePicker
                        value={editedClientData.conjoint_date_naissance || ''}
                        onChange={(value) => setEditedClientData(prev => ({ ...prev, conjoint_date_naissance: value }))}
                        placeholder="Sélectionner une date de naissance"
                        className="w-full"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {dossier.conjoint_date_naissance ? new Date(dossier.conjoint_date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée'}
                      </p>
                    )}
                  </div>

                  {/* Profession du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Catégorie professionnelle du conjoint
                    </label>
                    {isEditingClient ? (
                      <Select
                        value={String(editedClientData.conjoint_categorie_professionnelle || 0)}
                        onValueChange={(v) => setEditedClientData(prev => ({ ...prev, conjoint_categorie_professionnelle: parseInt(v) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {getCategoryLabel(dossier.conjoint_categorie_professionnelle)}
                      </p>
                    )}
                  </div>

                  {/* Statut fumeur du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Statut fumeur du conjoint
                    </label>
                    {isEditingClient ? (
                      <Select
                        value={editedClientData.conjoint_fumeur ? 'oui' : 'non'}
                        onValueChange={(value) => setEditedClientData(prev => ({ ...prev, conjoint_fumeur: value === 'oui' }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non">Non fumeur</SelectItem>
                          <SelectItem value="oui">Fumeur</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_fumeur ? 'Fumeur' : 'Non fumeur'}</p>
                    )}
                  </div>

                  {/* Email du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Email du conjoint
                    </label>
                    {isEditingClient ? (
                      <input
                        type="email"
                        value={editedClientData.conjoint_email}
                        onChange={(e) => setEditedClientData(prev => ({ ...prev, conjoint_email: e.target.value }))}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                        placeholder="email@exemple.fr"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_email || 'Non renseigné'}</p>
                    )}
                  </div>

                  {/* Téléphone du conjoint */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Téléphone du conjoint
                    </label>
                    {isEditingClient ? (
                      <input
                        type="tel"
                        value={editedClientData.conjoint_telephone}
                        onChange={(e) => setEditedClientData(prev => ({ ...prev, conjoint_telephone: e.target.value }))}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                        placeholder="06 12 34 56 78"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_telephone || 'Non renseigné'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Pret */}
        {activeTab === 'pret' && (
          <div className="space-y-6">
            {/* Informations du prêt */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {/* Header avec bouton responsive */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Informations du prêt - Extraites par l'IA
                </h3>

                {/* Desktop - boutons à côté du titre */}
                <div className="hidden sm:flex space-x-2">
                  <button
                    onClick={handleRefreshExtraction}
                    disabled={isExtracting}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <i className={`ri-refresh-line ${isExtracting ? 'animate-spin' : ''}`}></i>
                    <span>{isExtracting ? 'Extraction...' : 'Actualiser'}</span>
                  </button>

                  {!isEditingPret ? (
                    <button
                      onClick={() => setIsEditingPret(true)}
                      className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <i className="ri-edit-line mr-2"></i>
                      Modifier
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSavePretData}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover-bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        <i className="ri-save-line mr-2"></i>
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setIsEditingPret(false)}
                        className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Affichage du résultat d'extraction */}
              {extractionResult && (
                <div className="mb-6">
                  <ExtractionResult extractionData={extractionResult} />
                </div>
              )}

              {/* Affichage des erreurs d'extraction */}
              {extractionError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <i className="ri-error-warning-line text-red-500 mr-2"></i>
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Erreur d'extraction</h4>
                      <p className="text-sm text-red-700 mt-1">{extractionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Banque prêteuse
                  </label>
                  {isEditingPret ? (
                    <input
                      type="text"
                      value={editedPretData.banque_preteuse}
                      onChange={(e) => setEditedPretData((prev: EditedPretData) => ({ ...prev, banque_preteuse: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {dossier.infos_pret.banque_preteuse}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Montant du capital emprunté
                  </label>
                  {isEditingPret ? (
                    <input
                      type="number"
                      value={editedPretData.montant_capital}
                      onChange={(e) => setEditedPretData((prev: EditedPretData) => ({ ...prev, montant_capital: Number(e.target.value) }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {formatCurrency(dossier.infos_pret.montant_capital)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Durée du prêt (mois)
                  </label>
                  {isEditingPret ? (
                    <input
                      type="number"
                      value={editedPretData.duree_mois}
                      onChange={(e) => setEditedPretData((prev: EditedPretData) => ({ ...prev, duree_mois: Number(e.target.value) }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {dossier.infos_pret.duree_mois} mois ({Math.round(dossier.infos_pret.duree_mois / 12)} ans)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Type de prêt
                  </label>
                  {isEditingPret ? (
                    <Select
                      value={String(editedPretData.type_pret_code || 1)}
                      onValueChange={(v) => setEditedPretData((prev: EditedPretData) => ({ ...prev, type_pret_code: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_PRET_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {getTypePretLabel(dossier.infos_pret.type_pret_code)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Objet du financement
                  </label>
                  {isEditingPret ? (
                    <Select
                      value={String(editedPretData.objet_financement_code || 1)}
                      onValueChange={(v) => setEditedPretData((prev: EditedPretData) => ({ ...prev, objet_financement_code: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un objet" />
                      </SelectTrigger>
                      <SelectContent>
                        {OBJET_FINANCEMENT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {getObjetFinancementLabel(dossier.infos_pret.objet_financement_code)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Coût de l'assurance banque (mensuel)
                  </label>
                  {isEditingPret ? (
                    <input
                      type="number"
                      value={editedPretData.cout_assurance_banque || ''}
                      onChange={(e) => setEditedPretData((prev: EditedPretData) => ({ ...prev, cout_assurance_banque: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Ex: 280"
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {dossier.infos_pret.cout_assurance_banque ? formatCurrency(dossier.infos_pret.cout_assurance_banque) : 'Non disponible dans les documents'}
                    </p>
                  )}
                </div>

                {/* Fractionnement de l'assurance - Prime unique vs Mensuel */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Paiement de l'assurance
                  </label>
                  {isEditingPret ? (
                    <Select
                      value={String(editedPretData.frac_assurance || 12)}
                      onValueChange={(v) => setEditedPretData((prev: EditedPretData) => ({ ...prev, frac_assurance: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FRAC_ASSURANCE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-gray-500">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {dossier.infos_pret.frac_assurance === 10 ? 'Prime unique' : 'Mensuel'}
                    </p>
                  )}
                </div>

                {/* Informations supplémentaires extraites par l'IA */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Date de début du prêt
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.date_debut
                    ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border-[#335FAD]/20 dark:border-[#335FAD]/80 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.date_debut ? formatDate(dossier.infos_pret.date_debut) : 'Non extraite'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Date de fin du prêt
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.date_fin
                    ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border-[#335FAD]/20 dark:border-[#335FAD]/80 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.date_fin ? formatDate(dossier.infos_pret.date_fin) : 'Non extraite'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Taux nominal
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.taux_nominal
                    ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border-[#335FAD]/20 dark:border-[#335FAD]/80 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.taux_nominal ? `${dossier.infos_pret.taux_nominal}%` : 'Non extrait'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Date de début effective (calculée)
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.date_debut_effective
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.date_debut_effective ? formatDate(dossier.infos_pret.date_debut_effective) : 'Non calculée'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Durée restante (calculée)
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.duree_restante_mois
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.duree_restante_mois
                      ? `${dossier.infos_pret.duree_restante_mois} mois (${Math.round(dossier.infos_pret.duree_restante_mois / 12)} ans)`
                      : 'Non calculée'
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Capital restant dû (calculé)
                  </label>
                  <p className={`p-3 rounded-lg border ${dossier.infos_pret.capital_restant_du
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                    {dossier.infos_pret.capital_restant_du
                      ? formatCurrency(dossier.infos_pret.capital_restant_du)
                      : 'Non calculé'
                    }
                  </p>
                </div>
              </div>

              {/* Mobile - bouton en bas à droite */}
              <div className="sm:hidden mt-6 flex justify-end space-x-2">
                <button
                  onClick={handleRefreshExtraction}
                  disabled={isExtracting}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <i className={`ri-refresh-line ${isExtracting ? 'animate-spin' : ''}`}></i>
                  <span>{isExtracting ? 'Extraction...' : 'Actualiser'}</span>
                </button>

                {!isEditingPret ? (
                  <button
                    onClick={() => setIsEditingPret(true)}
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <i className="ri-edit-line mr-2"></i>
                    Modifier
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSavePretData}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      <i className="ri-save-line mr-2"></i>
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setIsEditingPret(false)}
                      className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section Documents fournis par l'apporteur */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Documents fournis par l'apporteur
                </h3>
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <i className="ri-add-line"></i>
                  <span>Ajouter un document</span>
                </button>
              </div>

              {/* Grille des documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Offre de Prêt */}
                <div className={`border-2 rounded-lg p-4 ${dossier.documents.offre_pret
                  ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dossier.documents.offre_pret
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                        <i className={`ri-file-text-line text-sm ${dossier.documents.offre_pret
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-500'
                          }`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          Offre de Prêt
                          <span className="text-red-500 ml-1">*</span>
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Document officiel de la banque
                        </p>
                      </div>
                    </div>
                    {dossier.documents.offre_pret && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.offre_pret.url), dossier.documents.offre_pret.nom, 'pdf')}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(dossier.documents.offre_pret.id, dossier.documents.offre_pret.nom)}
                          className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                          title="Supprimer le document"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {dossier.documents.offre_pret && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 truncate" title={dossier.documents.offre_pret.nom}>
                        {dossier.documents.offre_pret.nom}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {dossier.documents.offre_pret.taille}
                      </p>
                    </div>
                  )}
                  {!dossier.documents.offre_pret && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Document manquant
                    </p>
                  )}
                </div>

                {/* Tableau d'Amortissement */}
                <div className={`border-2 rounded-lg p-4 ${dossier.documents.tableau_amortissement
                  ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dossier.documents.tableau_amortissement
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                        <i className={`ri-table-line text-sm ${dossier.documents.tableau_amortissement
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-500'
                          }`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          Tableau d'Amortissement
                          <span className="text-red-500 ml-1">*</span>
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Détail des échéances
                        </p>
                      </div>
                    </div>
                    {dossier.documents.tableau_amortissement && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.tableau_amortissement.url), dossier.documents.tableau_amortissement.nom, 'pdf')}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(dossier.documents.tableau_amortissement.id, dossier.documents.tableau_amortissement.nom)}
                          className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                          title="Supprimer le document"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {dossier.documents.tableau_amortissement && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 truncate" title={dossier.documents.tableau_amortissement.nom}>
                        {dossier.documents.tableau_amortissement.nom}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {dossier.documents.tableau_amortissement.taille}
                      </p>
                    </div>
                  )}
                  {!dossier.documents.tableau_amortissement && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Document manquant
                    </p>
                  )}
                </div>

                {/* Carte d'Identité Emprunteur */}
                <div className={`border-2 rounded-lg p-4 ${dossier.documents.carte_identite
                  ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dossier.documents.carte_identite
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                        <i className={`ri-id-card-line text-sm ${dossier.documents.carte_identite
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 dark:text-gray-500'
                          }`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          Carte d'Identité (Emprunteur)
                          <span className="text-red-500 ml-1">*</span>
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Pièce d'identité principale
                        </p>
                      </div>
                    </div>
                    {dossier.documents.carte_identite && (
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.carte_identite.url), dossier.documents.carte_identite.nom, 'image')}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(dossier.documents.carte_identite.id, dossier.documents.carte_identite.nom)}
                          className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                          title="Supprimer le document"
                        >
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  {dossier.documents.carte_identite && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 truncate" title={dossier.documents.carte_identite.nom}>
                        {dossier.documents.carte_identite.nom}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {dossier.documents.carte_identite.taille}
                      </p>
                    </div>
                  )}
                  {!dossier.documents.carte_identite && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Document manquant
                    </p>
                  )}
                </div>

                {/* Carte d'Identité Conjoint - CONDITIONNEL */}
                {dossier.type === 'couple' && (
                  <div className={`border-2 rounded-lg p-4 ${dossier.documents.carte_identite_conjoint
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dossier.documents.carte_identite_conjoint
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-600'
                          }`}>
                          <i className={`ri-id-card-line text-sm ${dossier.documents.carte_identite_conjoint
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-400 dark:text-gray-500'
                            }`}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            Carte d'Identité (Conjoint)
                            <span className="text-red-500 ml-1">*</span>
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Pièce d'identité du conjoint
                          </p>
                        </div>
                      </div>
                      {dossier.documents.carte_identite_conjoint && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button
                            onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.carte_identite_conjoint.url), dossier.documents.carte_identite_conjoint.nom, 'image')}
                            className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                            title="Voir le document"
                          >
                            <i className="ri-eye-line text-xs"></i>
                          </button>
                          <button
                            onClick={() => openDeleteModal(dossier.documents.carte_identite_conjoint.id, dossier.documents.carte_identite_conjoint.nom)}
                            className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Supprimer le document"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    {dossier.documents.carte_identite_conjoint && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 truncate" title={dossier.documents.carte_identite_conjoint.nom}>
                          {dossier.documents.carte_identite_conjoint.nom}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">
                          {dossier.documents.carte_identite_conjoint.taille}
                        </p>
                      </div>
                    )}
                    {!dossier.documents.carte_identite_conjoint && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Document manquant
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section Autres Documents */}
              {dossier.documents.autres && dossier.documents.autres.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Autres documents ({dossier.documents.autres.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {dossier.documents.autres.map((doc: any, index: number) => (
                      <div
                        key={doc.id || index}
                        className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-600">
                              <i className="ri-file-line text-sm text-gray-600 dark:text-gray-400"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={doc.nom}>
                                {doc.nom}
                              </h4>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>{doc.taille}</span>
                                {doc.type && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{getDocumentTypeLabel(doc.type)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => handleViewDocument(buildPublicUrl(doc.url), doc.nom, doc.type || '', doc.id)}
                              className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                              title="Voir le document"
                            >
                              <i className="ri-eye-line text-xs"></i>
                            </button>
                            <button
                              onClick={() => openDeleteModal(doc.id, doc.nom)}
                              className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                              title="Supprimer le document"
                            >
                              <i className="ri-delete-bin-line text-xs"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Devis Comparatif */}
        {activeTab === 'devis' && (
          <>
            {/* Card d'optimisation intelligente des commissions */}
            <CommissionRecommendationCard
              dossierId={dossierId}
              coutAssuranceBanque={dossier.infos_pret?.cout_assurance_banque || dossier.cout_assurance_banque}
              onSelectCommission={(tarifId, code) => {
                console.log('Commission sélectionnée:', { tarifId, code });
                // Trouver le devis correspondant et ouvrir la modale
                const devisCorrespondant = devis.find(d => d.id_tarif === tarifId);
                if (devisCorrespondant) {
                  setSelectedDevisDetail(devisCorrespondant);
                  setShowDevisModal(true);
                }
              }}
              compact={false}
            />

            {/* Panneau de configuration des commissions (paramètres détaillés) */}
            {currentBrokerId && (
              <DevisCommissionPanel
                dossierId={dossierId}
                selectedDevisId={selectedDevisDetail?.id || devis.find(d => d.selected)?.id || null}
                selectedDevisCoutTotal={selectedDevisDetail?.cout_total || devis.find(d => d.selected)?.cout_total || 0}
                apporteurId={dossier.apporteur_id || null}
                brokerId={currentBrokerId}
                onRefreshDevis={handleRefreshDevis}
              />
            )}

            {/* Liste des devis avec vue hybride tableau/grille */}
            <DevisListView
              devis={devis}
              coutAssuranceBanque={dossier.infos_pret?.cout_assurance_banque || dossier.cout_assurance_banque}
              onDevisClick={(devisItem) => {
                setSelectedDevisDetail(devisItem);
                setShowDevisModal(true);
              }}
              onRefreshDevis={handleRefreshDevis}
              isRefreshing={isRefreshingDevis}
            />
          </>
        )}

        {/* Tab Réglages */}
        {activeTab === 'reglages' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <i className="ri-settings-3-line text-[#335FAD]"></i>
              Réglages du dossier
            </h3>

            {/* Section Type de dossier */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                  Type de dossier
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type actuel : <span className="text-[#335FAD] font-semibold">{dossier.is_couple ? 'Couple' : 'Emprunteur seul'}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Modifiez le type du dossier si nécessaire (emprunteur seul ↔ couple)
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newType = dossier.is_couple ? 'seul' : 'couple';
                      const confirmMsg = `Voulez-vous vraiment changer le type du dossier vers "${newType === 'couple' ? 'Couple' : 'Emprunteur seul'}" ?${newType === 'seul' ? '\n\n⚠️ ATTENTION : Les données du conjoint seront supprimées.' : ''}`;

                      if (confirm(confirmMsg)) {
                        try {
                          await DossiersService.changeDossierType(dossierId, newType);
                          await loadDossierData();
                          alert(`Type de dossier changé avec succès vers "${newType === 'couple' ? 'Couple' : 'Emprunteur seul'}"`);
                        } catch (error: unknown) {
                          console.error('Erreur changement type:', error);
                          const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
                          alert(`Erreur lors du changement de type de dossier: ${errorMsg}`);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <i className="ri-repeat-line"></i>
                    Changer vers {dossier.is_couple ? 'Emprunteur seul' : 'Couple'}
                  </button>
                </div>
              </div>

              {/* Section Extraction */}
              {extractionResult && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                    Dernière extraction
                  </h4>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-xl mt-0.5"></i>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
                          {extractionResult.message}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Confiance : {Math.round(extractionResult.confidence * 100)}%
                        </p>
                        {extractionResult.warnings && extractionResult.warnings.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Avertissements :</p>
                            <ul className="text-xs text-green-600 dark:text-green-500 list-disc list-inside">
                              {extractionResult.warnings.map((warning: string, idx: number) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Suppression du dossier */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i className="ri-delete-bin-line text-red-600"></i>
                  Zone dangereuse
                </h4>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                        Supprimer définitivement ce dossier
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400">
                        ⚠️ Cette action est irréversible. Toutes les données associées (client, prêt, devis, documents) seront supprimées.
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteDossier}
                      className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <i className="ri-delete-bin-line"></i>
                      Supprimer le dossier
                    </button>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-blue-600 dark:text-blue-400 text-xl mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                      Après chaque extraction automatique, si des différences sont détectées entre les données extraites et les données actuelles,
                      une fenêtre de comparaison s'ouvrira automatiquement pour vous permettre de sélectionner les changements à appliquer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CONFIRMATION ENVOI DEVIS */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowConfirmModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-lg w-full p-6">
              <div className="text-center">
                <i className="ri-send-plane-line text-[#335FAD] dark:text-[#335FAD]/80 text-2xl mb-3"></i>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Confirmer l'envoi du devis
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Êtes-vous sûr de vouloir choisir ce devis ? Il sera envoyé à l'apporteur pour validation client.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmEnvoiDevis}
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Confirmer l'envoi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALISATION DOSSIER */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowFinalizeModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-lg w-full p-6">
              <div className="text-center">
                <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-2xl mb-3"></i>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Marquer le dossier comme finalisé
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Êtes-vous sûr de vouloir finaliser ce dossier ? Cette action débloquera la saisie des frais de gestion pour l'apporteur.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowFinalizeModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmFinalisation}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Finaliser le dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL DEVIS - Nouvelle modale premium */}
      <DevisDetailModal
        isOpen={showDevisModal}
        onClose={() => setShowDevisModal(false)}
        devis={selectedDevisDetail}
        coutAssuranceBanque={dossier?.infos_pret?.cout_assurance_banque || dossier?.cout_assurance_banque}
        onRecalculateDevis={async (devisId, idTarif, commissionCode, fraisCourtierCentimes) => {
          try {
            console.log('[AdminDetail] Recalcul devis ciblé:', { devisId, idTarif, commissionCode, fraisCourtierCentimes });
            
            // Appel API Exade avec id_tarif spécifique et nouveau code commission
            const response = await fetch('/api/exade/tarifs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                broker_id: currentBrokerId,
                clientInfo: dossier,
                pretData: dossier?.infos_pret,
                idTarif: idTarif,
                commission: {
                  frais_adhesion_apporteur: fraisCourtierCentimes,
                  commissionnement: commissionCode || undefined
                }
              })
            });

            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || 'Erreur lors du recalcul');
            }

            const tarifs = payload?.tarifs || [];

            if (tarifs.length > 0) {
              const tarifRecalcule = tarifs[0];
              
              // Mettre à jour le devis avec les nouvelles données
              await DevisService.updateSingleDevis(
                devisId,
                {
                  cout_total: tarifRecalcule.cout_total,
                  cout_mensuel: tarifRecalcule.mensualite,
                  frais_adhesion: tarifRecalcule.frais_adhesion,
                  frais_adhesion_apporteur: tarifRecalcule.frais_adhesion_apporteur,
                  frais_frac: tarifRecalcule.frais_frac,
                  frais_courtier: fraisCourtierCentimes,
                  commission_exade_code: commissionCode,
                  taux_capital_assure: tarifRecalcule.taux_capital_assure,
                  compatible_lemoine: tarifRecalcule.compatible_lemoine,
                  formalites_medicales: tarifRecalcule.formalites_medicales,
                  type_tarif: tarifRecalcule.type_tarif,
                  erreurs: tarifRecalcule.erreurs
                },
                dossier?.infos_pret?.cout_assurance_banque || dossier?.cout_assurance_banque
              );

              // Recharger les données
              await loadDossierData();
              
              // Fermer la modale et informer l'utilisateur
              setShowDevisModal(false);
              alert('Devis recalculé avec succès !');
            } else {
              throw new Error('Aucun tarif retourné par Exade');
            }
          } catch (error) {
            console.error('[AdminDetail] Erreur recalcul devis:', error);
            alert('Erreur lors du recalcul du devis. Veuillez réessayer.');
          }
        }}
        onSelectDevis={(devisId) => {
          handleChoisirDevis(devisId);
          setShowDevisModal(false);
        }}
        onResendDevis={(devisId) => {
          handleRenvoyerDevis(devisId);
          setShowDevisModal(false);
        }}
        dossierStatut={dossier?.statut_canon}
        onPushToExade={async (devisId) => {
          if (!currentBrokerId) {
            alert('Erreur: ID du courtier non trouvé');
            return;
          }
          
          const result = await ExadePushService.pushDevisToExade(devisId, currentBrokerId);
          
          if (result.success) {
            alert(`✅ Devis envoyé sur Exade avec succès !\n\nID Simulation: ${result.simulation_id}\n\nRendez-vous sur www.exade.fr pour finaliser le contrat.`);
            // Recharger les données pour afficher le badge "Verrouillé"
            await loadDossierData();
            setShowDevisModal(false);
          } else {
            alert(`❌ Erreur: ${result.error}`);
          }
        }}
      />

      {/* MODAL AJOUT DOCUMENT */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDocumentModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Ajouter un document
                </h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type de document
                  </label>
                  <Select value={newDocumentType} onValueChange={setNewDocumentType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offrePret">Offre de Prêt</SelectItem>
                      <SelectItem value="tableauAmortissement">Tableau d'Amortissement</SelectItem>
                      <SelectItem value="carteIdentite">Carte d'Identité (Emprunteur)</SelectItem>
                      {dossier.type === 'couple' && (
                        <SelectItem value="carteIdentiteConjoint">Carte d'Identité (Conjoint)</SelectItem>
                      )}
                      <SelectItem value="bulletinDePaie">Bulletin de Paie</SelectItem>
                      <SelectItem value="avisImposition">Avis d'Imposition</SelectItem>
                      <SelectItem value="contratTravail">Contrat de Travail</SelectItem>
                      <SelectItem value="autre">Autre Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fichier
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <i className="ri-upload-cloud-line text-gray-500 dark:text-gray-400 text-2xl mb-2"></i>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Cliquez pour télécharger</span> ou glissez-déposez
                        </p>
                        {newDocumentFile && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ {newDocumentFile.name}
                          </p>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowDocumentModal(false);
                      setNewDocumentType('');
                      setNewDocumentFile(null);
                    }}
                    disabled={isUploadingDocument}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUploadDocument}
                    disabled={!newDocumentType || !newDocumentFile || isUploadingDocument}
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isUploadingDocument ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        <span>Upload en cours...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-upload-line"></i>
                        <span>Ajouter le document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION DOCUMENT */}
      {showDeleteDocModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDeleteDocModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <i className="ri-delete-bin-line text-red-600 dark:text-red-400 text-xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Supprimer le document
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowDeleteDocModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (documentToDelete) {
                        handleDeleteDocument(documentToDelete, 'document');
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPARAISON DE DONNÉES */}
      {showComparisonModal && diffReport && (
        <DataComparisonModal
          isOpen={showComparisonModal}
          onClose={async () => {
            // Marquer la modale comme vue dans la DB
            try {
              const { error } = await supabase
                .from('dossiers')
                .update({ comparison_modal_seen: true })
                .eq('id', dossierId);

              if (error) {
                console.error('[AdminDetail] Erreur marquage modale vue:', error);
              }
            } catch (err) {
              console.error('[AdminDetail] Erreur marquage modale:', err);
            }

            setShowComparisonModal(false);
            setDiffReport(null);
            setExtractedClientData(null);
          }}
          diffReport={diffReport}
          onApplyChanges={handleApplyDataChanges}
        />
      )}

      {/* MODAL SUPPRESSION DOSSIER */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-6">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            ></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-lg w-full p-6 relative z-10 my-8 max-h-[90vh] overflow-y-auto">
              {/* Header avec icône de danger */}
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <i className="ri-delete-bin-line text-red-600 dark:text-red-400 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Supprimer le dossier {dossier.numero_dossier}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cette action est irréversible et supprimera définitivement :
                </p>
              </div>

              {/* Liste des éléments qui seront supprimés */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <ul className="space-y-2 text-sm text-red-900 dark:text-red-300">
                  <li className="flex items-start">
                    <i className="ri-close-circle-line text-red-600 dark:text-red-400 mr-2 mt-0.5"></i>
                    <span>Le dossier et toutes ses métadonnées</span>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-close-circle-line text-red-600 dark:text-red-400 mr-2 mt-0.5"></i>
                    <span>Les informations client (principal et conjoint)</span>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-close-circle-line text-red-600 dark:text-red-400 mr-2 mt-0.5"></i>
                    <span>Les données de prêt</span>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-close-circle-line text-red-600 dark:text-red-400 mr-2 mt-0.5"></i>
                    <span>Tous les devis générés</span>
                  </li>
                  <li className="flex items-start">
                    <i className="ri-close-circle-line text-red-600 dark:text-red-400 mr-2 mt-0.5"></i>
                    <span>Tous les documents associés</span>
                  </li>
                </ul>
              </div>

              {/* Champ de confirmation */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pour confirmer, tapez <span className="font-bold text-red-600 dark:text-red-400">SUPPRIMER</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder="Tapez SUPPRIMER"
                  className="w-full px-4 py-3 border-2 border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white transition-colors"
                  autoFocus
                />
              </div>

              {/* Warning final */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
                <div className="flex items-start">
                  <i className="ri-alert-line text-amber-600 dark:text-amber-400 mr-2 mt-0.5"></i>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Attention :</strong> Cette action ne peut pas être annulée. Toutes les données seront perdues définitivement.
                  </p>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmInput('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteDossier}
                  disabled={deleteConfirmInput !== 'SUPPRIMER'}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <i className="ri-delete-bin-line"></i>
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualiseur de Document */}
      <DocumentViewerModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        documentUrl={currentDocUrl}
        documentId={currentDocId}
        documentTitle={currentDocTitle}
        documentType={currentDocType}
      />
    </div>
  );
}
