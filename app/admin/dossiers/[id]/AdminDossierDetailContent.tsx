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
  client_nom: string;
  client_prenom: string;
  client_email: string;
  client_telephone: string;
  client_date_naissance: string;
  client_adresse: string;
  client_profession: string;
  // Informations du conjoint (si dossier couple)
  conjoint_nom?: string;
  conjoint_prenom?: string;
  conjoint_date_naissance?: string;
  conjoint_profession?: string;
  conjoint_revenus?: string;
  conjoint_fumeur?: boolean;
  client_fumeur: boolean;
  apporteur_id: string;
  apporteur_nom: string;
  apporteur_prenom: string;
  apporteur_email: string;
  date_soumission: string;
  // STATUT CRITIQUE - Synchronisé en temps réel avec la DB
  status: 'nouveau' | 'devis_envoye' | 'devis_disponible' | 'valide' | 'refuse' | 'finalise';
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
  frais_frac: number;
  detail_pret: {
    capital: number;
    duree: number;
    taux_assurance: number;
  };
  formalites_detaillees: string[];
  erreurs: string[];
}

// Interfaces locales pour les états d'édition afin d'éviter les any implicites
interface EditedClientData {
  client_nom: string;
  client_prenom: string;
  client_email: string;
  client_telephone: string;
  client_date_naissance: string;
  client_adresse: string;
  client_profession: string;
  // Informations du conjoint (si dossier couple)
  conjoint_nom?: string;
  conjoint_prenom?: string;
  conjoint_date_naissance?: string;
  conjoint_profession?: string;
  conjoint_revenus?: string;
  conjoint_fumeur?: boolean;
  client_fumeur: boolean;
}

interface EditedPretData {
  banque_preteuse: string;
  montant_capital: number;
  duree_mois: number;
  type_pret: string;
  cout_assurance_banque: number | null;
}

interface AdminDossierDetailContentProps {
  dossierId: string;
}

export default function AdminDossierDetailContent({ dossierId }: AdminDossierDetailContentProps) {
  const router = useRouter();
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
    client_nom: '',
    client_prenom: '',
    client_email: '',
    client_telephone: '',
    client_date_naissance: '',
    client_adresse: '',
    client_profession: '',
    // Informations du conjoint (si dossier couple)
    conjoint_nom: '',
    conjoint_prenom: '',
    conjoint_date_naissance: '',
    conjoint_profession: '',
    conjoint_revenus: '',
    conjoint_fumeur: false,
    client_fumeur: false
  });
  const [editedPretData, setEditedPretData] = useState<EditedPretData>({
    banque_preteuse: '',
    montant_capital: 0,
    duree_mois: 0,
    type_pret: '',
    cout_assurance_banque: null
  });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);

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
   */
  const [dossier, setDossier] = useState<DossierDetail>({
    id: dossierId,
    numero_dossier: `DSS-2024-00${dossierId}`,
    type: 'seul',
    is_couple: false,
    client_nom: 'Martin',
    client_prenom: 'Pierre',
    client_email: 'pierre.martin@email.com',
    client_telephone: '06 12 34 56 78',
    client_date_naissance: '1985-03-15',
    client_adresse: '15 rue de la République, 75001 Paris',
    client_profession: 'Ingénieur informatique',
    client_fumeur: false,
    apporteur_id: 'ap1',
    apporteur_nom: 'Dubois',
    apporteur_prenom: 'Marie',
    apporteur_email: 'marie.dubois@email.com',
    date_soumission: '2024-01-15T10:30:00Z',
    // STATUT EN TEMPS RÉEL - Reflète l'état exact de la DB
    status: dossierId === '1' ? 'nouveau' : dossierId === '2' ? 'devis_envoye' : dossierId === '3' ? 'valide' : dossierId === '4' ? 'refuse' : 'finalise',
    type_assurance: 'Prêt Immobilier',
    montant_capital: 350000,
    duree_pret: 20,
    donnees_saisies: {
      situation_familiale: 'Marié(e)',
      nombre_enfants: 2,
      profession: 'Ingénieur informatique',
      revenus_mensuels: 4500,
      charges_mensuelles: 1200,
      fumeur: false,
      pratique_sport_risque: false
    },
    donnees_ia: {
      risque_medical: 'Faible',
      score_assurabilite: 85,
      recommandations: ['Contrat standard recommandé', 'Aucune surprime nécessaire'],
      donnees_extraites: {
        age: 39,
        imc: 23.5,
        antecedents_medicaux: 'Aucun',
        profession_risque: 'Standard'
      }
    },
    infos_pret: {
      banque_preteuse: 'Crédit Agricole',
      montant_capital: 350000,
      duree_mois: 240,
      type_pret: 'Amortissable à taux fixe',
      cout_assurance_banque: 280
    },
    documents: {
      offre_pret: null,
      tableau_amortissement: null,
      carte_identite: null,
      carte_identite_conjoint: null
    },
    commentaire_apporteur: undefined,
    cout_assurance_banque: dossierId === '1' ? undefined : 280,
    commentaire_refus: dossierId === '4' ? 'Le client trouve les tarifs trop élevés par rapport à son assurance bancaire actuelle.' : undefined,
    date_validation: dossierId === '3' ? '2024-01-17T11:30:00Z' : undefined,
    date_refus: dossierId === '4' ? '2024-01-18T08:45:00Z' : undefined,
    date_finalisation: dossierId === '5' ? '2024-01-19T14:20:00Z' : undefined
  });

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
   */
  const [devis, setDevis] = useState<Devis[]>([
    {
      id: 'devis1',
      compagnie: 'Generali',
      produit: 'ASSUREA PRET 7301 CI',
      cout_mensuel: 95.50,
      cout_total: 22920,
      economie_estimee: 44280,
      formalites_medicales: ['Questionnaire de santé', 'Examen médical si > 300k€'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT'],
      exclusions: ['Sports extrêmes', 'Guerre'],
      avantages: ['Remboursement anticipé sans frais', 'Garantie chômage optionnelle'],
      // STATUT SÉLECTIONNÉ - Reflète la sélection admin en temps réel
      selected: dossierId === '2' || dossierId === '3' || dossierId === '4' || dossierId === '5',
      refused: false,
      id_simulation: 'SIM_2024_001',
      id_tarif: '1',
      cout_total_tarif: 22920,
      frais_adhesion: 30,
      frais_frac: 20,
      detail_pret: {
        capital: 350000,
        duree: 240,
        taux_assurance: 0.33
      },
      formalites_detaillees: [
        'Questionnaire de santé simplifié',
        'Examen médical obligatoire si capital > 300 000€',
        'Analyse d\'urine et prise de sang si âge > 50 ans',
        'Rapport du médecin traitant si antécédents déclarés'
      ],
      erreurs: []
    },
    {
      id: 'devis2',
      compagnie: 'Swisslife',
      produit: 'EMPRUNTEUR SECURITE PLUS',
      cout_mensuel: 102.30,
      cout_total: 24552,
      economie_estimee: 42648,
      formalites_medicales: ['Questionnaire de santé détaillé'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT', 'IPP'],
      exclusions: ['Maladies préexistantes', 'Sports à risque'],
      avantages: ['Franchise ITT réduite', 'Prise en charge psychologique'],
      selected: false,
      refused: false,
      id_simulation: 'SIM_2024_002',
      id_tarif: '2',
      cout_total_tarif: 24552,
      frais_adhesion: 45,
      frais_frac: 12,
      detail_pret: {
        capital: 350000,
        duree: 240,
        taux_assurance: 0.39
      },
      formalites_detaillees: [
        'Questionnaire de santé détaillé obligatoire',
        'Téléconsultation médicale systématique',
        'Bilan cardiologique si âge > 45 ans',
        'Examen spécialisé selon profession à risque'
      ],
      erreurs: []
    },
    {
      id: 'devis3',
      compagnie: 'Allianz',
      produit: 'ALLIANZ EMPRUNTEUR OPTIMAL',
      cout_mensuel: 89.75,
      cout_total: 21540,
      economie_estimee: 45660,
      formalites_medicales: ['Questionnaire simplifié', 'Téléconsultation médicale'],
      couverture: ['Décès', 'PTIA', 'ITT', 'IPT'],
      exclusions: ['Suicide 1ère année', 'Alcoolisme'],
      avantages: ['Souscription 100% digitale', 'Tarif préférentiel non-fumeur'],
      selected: false,
      refused: false,
      id_simulation: 'SIM_2024_003',
      id_tarif: '3',
      cout_total_tarif: 21540,
      frais_adhesion: 25,
      frais_frac: 8,
      detail_pret: {
        capital: 350000,
        duree: 240,
        taux_assurance: 0.31
      },
      formalites_detaillees: [
        'Questionnaire de santé simplifié en ligne',
        'Téléconsultation médicale gratuite incluse',
        'Pas d\'examen complémentaire jusqu\'à 500 000€',
        'Validation automatique si profil standard'
      ],
      erreurs: []
    }
  ]);

  // Charger et appliquer les données DB (remplace les mocks)
  useEffect(() => {
    (async () => {
      try {
        const data: any = await DossiersService.getDossierById(dossierId);
        if (!data) return;
        const ci = Array.isArray(data.client_infos) ? data.client_infos[0] : null;
        const pret = Array.isArray(data.pret_data) ? data.pret_data[0] : null;
        const docs = Array.isArray(data.documents) ? data.documents : [];
        const canon = (data.statut as any) || 'nouveau';
        const mapCanonToAdmin = (s: string) => {
          if (s === 'finalise') return 'finalise';
          if (s === 'refuse') return 'refuse';
          if (s === 'devis_accepte') return 'valide';
          if (s === 'devis_disponible') return 'devis_envoye';
          if (s === 'en_attente' || s === 'nouveau') return 'nouveau';
          return 'nouveau';
        };
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
          status: mapCanonToAdmin(canon),
          type_assurance: pret?.type_pret || (prev as any)?.type_assurance || 'Prêt Immobilier',
          montant_capital: Number(pret?.montant_capital || (prev as any)?.montant_capital || 0),
          duree_pret: Number(pret?.duree_mois || ((prev as any)?.duree_pret || 0) * 12) / 12,
          infos_pret: {
            ...(prev as any)?.infos_pret,
            banque_preteuse: pret?.banque_preteuse || (prev as any)?.infos_pret?.banque_preteuse || '',
            montant_capital: Number(pret?.montant_capital || (prev as any)?.infos_pret?.montant_capital || 0),
            duree_mois: Number(pret?.duree_mois || (prev as any)?.infos_pret?.duree_mois || 0),
            type_pret: pret?.type_pret || (prev as any)?.infos_pret?.type_pret || '',
          },
          documents: mapDocumentsFromRows(docs, (prev as any)?.documents),
          commentaire_apporteur: data.commentaire || undefined
        }) as any);
      } catch (e) {
        console.error('[AdminDetail] fetch DB error', e);
      }
    })();
  }, [dossierId]);

  function mapDocumentsFromRows(rows: any[], prevDocs?: any) {
    const findDocMulti = (types: string[]) => rows.find((r: any) => types.includes(r.document_type));
    const toObj = (row?: any) => row ? {
      nom: row.document_name,
      url: row.storage_path,
      taille: row.file_size ? `${(row.file_size / (1024*1024)).toFixed(1)} MB` : ''
    } : null;
    return {
      offre_pret: toObj(findDocMulti(['offre_pret','offrePret'])) || prevDocs?.offre_pret || null,
      tableau_amortissement: toObj(findDocMulti(['tableau_amortissement','tableauAmortissement'])) || prevDocs?.tableau_amortissement || null,
      carte_identite: toObj(findDocMulti(['carte_identite','carteIdentite'])) || prevDocs?.carte_identite || null,
      carte_identite_conjoint: toObj(findDocMulti(['carte_identite_conjoint','carteIdentiteConjoint'])) || prevDocs?.carte_identite_conjoint || null,
    };
  }

  const buildPublicUrl = (key: string) => {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    return `${base}/storage/v1/object/public/documents/${key}`
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

        // 2) Aucun devis: tenter EXADE puis fallback mocks si erreur
        try {
          const resp = await fetch('/api/exade/tarifs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientInfo: (dossier as any), pretData: (dossier as any).infos_pret })
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
          console.warn('[AdminDetail] EXADE indisponible', exErr);
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AdminDetail] Fallback mocks activé en développement');
            const mocks = Array.from({ length: 3 }).map((_, idx) => ({
              dossier_id: dossier.id,
              numero_devis: `MOCK-${Date.now()}-${idx + 1}`,
              statut: 'en_attente',
              donnees_devis: {
                compagnie: idx === 0 ? 'Assureur A' : idx === 1 ? 'Assureur B' : 'Assureur C',
                reference: `REF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
                mensualite: 40 + idx * 10,
                primeTotale: (40 + idx * 10) * ((dossier as any)?.duree_pret ? (dossier as any).duree_pret * 12 : 240),
                garanties: [{ libelle: 'DC' }, { libelle: 'PTIA' }]
              },
              date_generation: new Date().toISOString(),
              date_expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }));
            await DevisService.createMultipleDevis(mocks as any);
          } else {
            console.error('[AdminDetail] EXADE indisponible en production - pas de création de mocks');
          }
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
        client_profession: dossier.client_profession,
        // Informations du conjoint (si dossier couple)
        conjoint_nom: dossier.conjoint_nom || '',
        conjoint_prenom: dossier.conjoint_prenom || '',
        conjoint_date_naissance: dossier.conjoint_date_naissance || '',
        conjoint_profession: dossier.conjoint_profession || '',
        conjoint_revenus: dossier.conjoint_revenus || '',
        conjoint_fumeur: dossier.conjoint_fumeur || false,
        client_fumeur: dossier.client_fumeur
      });

      setEditedPretData({
        banque_preteuse: dossier.infos_pret.banque_preteuse,
        montant_capital: dossier.infos_pret.montant_capital,
        duree_mois: dossier.infos_pret.duree_mois,
        type_pret: dossier.infos_pret.type_pret,
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
    // Toujours pré-remplir depuis le dossier courant avant d'entrer en mode édition
    setEditedClientData({
      client_nom: dossier.client_nom,
      client_prenom: dossier.client_prenom,
      client_email: dossier.client_email,
      client_telephone: dossier.client_telephone,
      client_date_naissance: dossier.client_date_naissance,
      client_adresse: dossier.client_adresse,
      client_profession: dossier.client_profession,
      // Informations du conjoint (si dossier couple)
      conjoint_nom: dossier.conjoint_nom || '',
      conjoint_prenom: dossier.conjoint_prenom || '',
      conjoint_date_naissance: dossier.conjoint_date_naissance || '',
      conjoint_profession: dossier.conjoint_profession || '',
      conjoint_revenus: dossier.conjoint_revenus || '',
      conjoint_fumeur: dossier.conjoint_fumeur || false,
      client_fumeur: dossier.client_fumeur
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
    try {
      console.log('Sauvegarde des données client:', editedClientData);
      
      // Validation basique + sauvegarde via service (update si existe, sinon insert)
      const payload: any = {
        dossier_id: dossier.id,
        client_nom: editedClientData.client_nom,
        client_prenom: editedClientData.client_prenom,
        client_email: editedClientData.client_email,
        client_telephone: editedClientData.client_telephone,
        client_date_naissance: editedClientData.client_date_naissance,
        client_adresse: editedClientData.client_adresse,
        client_profession: editedClientData.client_profession,
        // Informations du conjoint (si dossier couple)
        conjoint_nom: editedClientData.conjoint_nom || null,
        conjoint_prenom: editedClientData.conjoint_prenom || null,
        conjoint_date_naissance: editedClientData.conjoint_date_naissance || null,
        conjoint_profession: editedClientData.conjoint_profession || null,
        conjoint_revenus: editedClientData.conjoint_revenus || null,
        conjoint_fumeur: editedClientData.conjoint_fumeur || false,
        client_fumeur: editedClientData.client_fumeur,
      };
      const validationErrors = ClientInfosService.validateClientData(payload);
      if (validationErrors.length > 0) {
        alert(validationErrors.join('\n'));
        return;
      }
      const saved = await ClientInfosService.upsertClientInfo(payload);
      
      // Mettre à jour l'état local (sera synchronisé par subscription)
      setDossier(prev => ({
        ...prev,
        client_nom: saved?.client_nom ?? editedClientData.client_nom,
        client_prenom: saved?.client_prenom ?? editedClientData.client_prenom,
        client_email: saved?.client_email ?? editedClientData.client_email,
        client_telephone: saved?.client_telephone ?? editedClientData.client_telephone,
        client_date_naissance: saved?.client_date_naissance ?? editedClientData.client_date_naissance,
        client_adresse: saved?.client_adresse ?? editedClientData.client_adresse,
        client_profession: saved?.client_profession ?? editedClientData.client_profession,
        // Informations du conjoint (si dossier couple)
        conjoint_nom: saved?.conjoint_nom ?? editedClientData.conjoint_nom,
        conjoint_prenom: saved?.conjoint_prenom ?? editedClientData.conjoint_prenom,
        conjoint_date_naissance: saved?.conjoint_date_naissance ?? editedClientData.conjoint_date_naissance,
        conjoint_profession: saved?.conjoint_profession ?? editedClientData.conjoint_profession,
        conjoint_revenus: saved?.conjoint_revenus ?? editedClientData.conjoint_revenus,
        conjoint_fumeur: saved?.conjoint_fumeur ?? editedClientData.conjoint_fumeur,
        client_fumeur: saved?.client_fumeur ?? editedClientData.client_fumeur
      }));
      
      // Pas de refetch immédiat pour éviter d'écraser l'état si la DB est ralentie
      setIsEditingClient(false);
    } catch (error: any) {
      console.error('Erreur sauvegarde données client:', error);
      alert(error?.message || 'Erreur lors de la sauvegarde des données client');
    }
  };

  const handleCancelEditClient = () => {
    setIsEditingClient(false);
    // Réinitialiser les données éditées avec les données actuelles du dossier
    setEditedClientData({
      client_nom: dossier.client_nom,
      client_prenom: dossier.client_prenom,
      client_email: dossier.client_email,
      client_telephone: dossier.client_telephone,
      client_date_naissance: dossier.client_date_naissance,
      client_adresse: dossier.client_adresse,
      client_profession: dossier.client_profession,
      conjoint_nom: dossier.conjoint_nom || '',
      conjoint_prenom: dossier.conjoint_prenom || '',
      conjoint_date_naissance: dossier.conjoint_date_naissance || '',
      conjoint_profession: dossier.conjoint_profession || '',
      conjoint_revenus: dossier.conjoint_revenus || '',
      conjoint_fumeur: dossier.conjoint_fumeur || false,
      client_fumeur: dossier.client_fumeur
    });
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
      setDossier(prev => ({
        ...prev,
        infos_pret: {
          banque_preteuse: saved.banque_preteuse,
          montant_capital: saved.montant_capital,
          duree_mois: saved.duree_mois,
          type_pret: saved.type_pret,
          cout_assurance_banque: saved.cout_assurance_banque
        } as any
      }));
      
      setIsEditingPret(false);
    } catch (error) {
      console.error('Erreur sauvegarde données prêt:', error);
    }
  };

  // ============================================================================
  // SUPABASE INTEGRATION - GESTION DES DOCUMENTS
  // ============================================================================

  /**
   * SUPPRESSION D'UN DOCUMENT
   * 
   * Supprime le fichier de Supabase Storage et l'entrée de la table 'documents'
   */
  const handleDeleteDocument = async (documentType: string) => {
    try {
      console.log('Suppression du document:', documentType);
      
      // SUPABASE: Suppression complète du document
      /*
      // 1. Récupérer le chemin du fichier
      const { data: docData } = await supabase
        .from('documents')
        .select('file_path')
        .eq('dossier_id', dossierId)
        .eq('type', documentType)
        .single();

      if (docData?.file_path) {
        // 2. Supprimer de Storage
        await supabase.storage
          .from('documents')
          .remove([docData.file_path]);
      }

      // 3. Supprimer de la table
      await supabase
        .from('documents')
        .delete()
        .eq('dossier_id', dossierId)
        .eq('type', documentType);
      */
      
      // Mettre à jour l'état local
      setDossier(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: null
        }
      }));
      
      setShowDeleteDocModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Erreur suppression document:', error);
    }
  };

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
      
      setDossier(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: newDocument
        }
      }));
      
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Erreur ajout document:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      nouveau: { color: 'bg-[#335FAD]/10 text-[#335FAD] dark:bg-[#335FAD]/30 dark:text-[#335FAD]', text: 'Nouveau', icon: 'ri-file-add-line' },
      devis_envoye: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', text: 'Devis envoyé', icon: 'ri-send-plane-line' },
      valide: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Validé', icon: 'ri-check-line' },
      refuse: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', text: 'Refusé', icon: 'ri-close-line' },
      finalise: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', text: 'Finalisé', icon: 'ri-checkbox-circle-line' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', text: 'En cours', icon: 'ri-time-line' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <i className={`${config.icon} mr-2`}></i>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateEconomie = (coutDevis: number, coutBanque?: number) => {
    if (!coutBanque) return null;
    const economie = (coutBanque * dossier.infos_pret.duree_mois) - coutDevis;
    const pourcentage = ((economie / (coutBanque * dossier.infos_pret.duree_mois)) * 100);
    return { economie, pourcentage };
  };

  const handleDevisRowClick = (devis: Devis) => {
    setSelectedDevisDetail(devis);
    setShowDevisModal(true);
  };

  const handleChoisirDevis = async (devisId: string) => {
    // Si l'id n'est pas un UUID valide (ex: 'devis1'), on crée en DB un devis à partir du mock sélectionné
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(devisId)) {
      const mock = devis.find(d => d.id === devisId);
      if (mock) {
        try {
          const created = await DevisService.createDevisFromMock(mock, dossier.id);
          // Remplace l'id local par l'uuid DB créé
          setDevis(prev => prev.map(d => d.id === devisId ? { ...d, id: created.id, numero_devis: created.numero_devis } as any : d));
          devisId = created.id;
        } catch (e) {
          console.error('[AdminDetail] création devis mock en DB échouée', e);
          alert('Impossible de créer le devis en base pour l\'envoi');
          return;
        }
      }
    }
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
      
      setDossier(prev => ({
        ...prev,
        status: 'devis_envoye'
      }));

      // Fermer la modale
      setShowDevisModal(false);
      
      alert('Devis renvoyé avec succès ! L\'apporteur recevra une notification.');

    } catch (error) {
      console.error('[AdminDetail] Erreur lors du renvoi du devis:', error);
      alert('Erreur lors du renvoi du devis. Veuillez réessayer.');
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
      
      setDossier(prev => ({
        ...prev,
        status: 'devis_envoye'
      }));
      
      // Refetch dossier + devis pour aligner l'état (selected via devis_selectionne_id)
      try {
        const refreshed = await DossiersService.getDossierById(dossierId);
        const selectedId = refreshed?.devis_selectionne_id || null;
        const freshDevis = (refreshed?.devis || []).map((d: any) => ({
          ...d,
          selected: selectedId ? d.id === selectedId : false,
          refused: d.statut === 'refuse',
        }));
        setDossier(prev => ({ ...prev, status: 'devis_envoye' }));
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
      setDossier(prev => ({
        ...prev,
        status: 'finalise',
        date_finalisation: new Date().toISOString()
      }));
      
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

  const handleViewDocument = (url: string) => {
    console.log('Visualisation du document:', url);
    window.open(url, '_blank');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
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
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Vue d&apos;ensemble
              </button>
              <button
                onClick={() => setActiveTab('client')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'client'
                    ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Données client
              </button>
              <button
                onClick={() => setActiveTab('pret')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'pret'
                    ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Infos du prêt
              </button>
              <button
                onClick={() => setActiveTab('devis')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'devis'
                    ? 'border-[#335FAD] text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Devis comparatif
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
                            <p className={`font-medium ${
                              (economieCalculee?.economie || selectedDevis.economie_estimee || 0) > 0 
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
                      {dossier.client_prenom} {dossier.client_nom}
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
                        {dossier.conjoint_prenom} {dossier.conjoint_nom}
                      </p>
                    </div>
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
                    {dossier.conjoint_profession && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Profession
                        </label>
                        <p className="text-gray-900 dark:text-white">{dossier.conjoint_profession}</p>
                      </div>
                    )}
                    {dossier.conjoint_revenus && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Revenus
                        </label>
                        <p className="text-gray-900 dark:text-white">{dossier.conjoint_revenus}€/mois</p>
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
                          className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                            d.action_type === 'accepte'
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
                              <div className={`w-3 h-3 rounded-full ${
                                d.action_type === 'accepte'
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
                  Profession
                </label>
                {isEditingClient ? (
                  <input
                    type="text"
                    value={editedClientData.client_profession}
                    onChange={(e) => setEditedClientData((prev: EditedClientData) => ({ ...prev, client_profession: e.target.value }))}
                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {dossier.client_profession}
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
                      Profession du conjoint
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientData.conjoint_profession}
                        onChange={(e) => setEditedClientData(prev => ({ ...prev, conjoint_profession: e.target.value }))}
                        className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">{dossier.conjoint_profession || 'Non renseignée'}</p>
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
                
                {/* Desktop - bouton à côté du titre */}
                <div className="hidden sm:flex">
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
                    <input
                      type="text"
                      value={editedPretData.type_pret}
                      onChange={(e) => setEditedPretData((prev: EditedPretData) => ({ ...prev, type_pret: e.target.value }))}
                      className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                      {dossier.infos_pret.type_pret}
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
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
              </div>

              {/* Mobile - bouton en bas à droite */}
              <div className="sm:hidden mt-6 flex justify-end">
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
                <div className={`border-2 rounded-lg p-4 ${
                  dossier.documents.offre_pret 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        dossier.documents.offre_pret 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <i className={`ri-file-text-line text-sm ${
                          dossier.documents.offre_pret 
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
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.offre_pret.url))}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => {
                            setDocumentToDelete('offre_pret');
                            setShowDeleteDocModal(true);
                          }}
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
                <div className={`border-2 rounded-lg p-4 ${
                  dossier.documents.tableau_amortissement 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        dossier.documents.tableau_amortissement 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <i className={`ri-table-line text-sm ${
                          dossier.documents.tableau_amortissement 
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
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.tableau_amortissement.url))}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => {
                            setDocumentToDelete('tableau_amortissement');
                            setShowDeleteDocModal(true);
                          }}
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
                <div className={`border-2 rounded-lg p-4 ${
                  dossier.documents.carte_identite 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        dossier.documents.carte_identite 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <i className={`ri-id-card-line text-sm ${
                          dossier.documents.carte_identite 
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
                          onClick={() => handleViewDocument(buildPublicUrl(dossier.documents.carte_identite.url))}
                          className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                          title="Voir le document"
                        >
                          <i className="ri-eye-line text-xs"></i>
                        </button>
                        <button
                          onClick={() => {
                            setDocumentToDelete('carte_identite');
                            setShowDeleteDocModal(true);
                          }}
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
                  <div className={`border-2 rounded-lg p-4 ${
                    dossier.documents.carte_identite_conjoint 
                      ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 border-dashed'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          dossier.documents.carte_identite_conjoint 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-gray-100 dark:bg-gray-600'
                        }`}>
                          <i className={`ri-id-card-line text-sm ${
                            dossier.documents.carte_identite_conjoint 
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
                            onClick={() => handleViewDocument(dossier.documents.carte_identite_conjoint.url)}
                            className="p-1.5 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] rounded-md transition-colors cursor-pointer"
                            title="Voir le document"
                          >
                            <i className="ri-eye-line text-xs"></i>
                          </button>
                          <button
                            onClick={() => {
                              setDocumentToDelete('carte_identite_conjoint');
                              setShowDeleteDocModal(true);
                            }}
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
            </div>
          </div>
        )}

        {/* Tab Devis Comparatif */}
        {activeTab === 'devis' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Devis comparatif - Solutions d'assurance emprunteur
            </h3>
            
            {/* Tableau des devis */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Compagnie
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Produit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Coût Mensuel
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Coût Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Économie Estimée
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Formalités
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {devis.map((devisItem) => {
                    const economieCalculee = calculateEconomie(devisItem.cout_total, dossier.infos_pret.cout_assurance_banque);
                    return (
                      <tr 
                        key={devisItem.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                          devisItem.selected ? 'ring-2 ring-[#335FAD] dark:ring-[#335FAD]/80 bg-[#335FAD]/5 dark:bg-[#335FAD]/10' : ''
                        }`}
                        onClick={() => handleDevisRowClick(devisItem)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{devisItem.compagnie}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{devisItem.produit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{formatCurrency(devisItem.cout_mensuel)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(devisItem.cout_total)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            (economieCalculee?.economie || devisItem.economie_estimee || 0) > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(economieCalculee?.economie || devisItem.economie_estimee || 0)}
                            {economieCalculee && (
                              <span className="text-xs ml-1">
                                ({economieCalculee.pourcentage.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {(devisItem.formalites_medicales || []).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {devisItem.statut === 'accepte' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <i className="ri-check-double-line mr-1"></i>
                              Accepté
                            </span>
                          ) : devisItem.statut === 'envoye' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                              <i className="ri-send-plane-line mr-1"></i>
                              Envoyé
                            </span>
                          ) : devisItem.selected && !devisItem.refused ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              <i className="ri-check-line mr-1"></i>
                              Sélectionné
                            </span>
                          ) : devisItem.refused ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              <i className="ri-close-line mr-1"></i>
                              <span className="font-medium text-red-800 dark:text-red-400">Refusé</span>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDevisDetail(devisItem);
                                setShowDevisModal(true);
                              }}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#335FAD] dark:hover:text-[#335FAD] transition-colors cursor-pointer"
                              title="Voir les détails du devis"
                            >
                              <i className="ri-eye-line text-sm"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* MODAL DÉTAIL DEVIS */}
      {showDevisModal && selectedDevisDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDevisModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all sm:max-w-2xl w-full p-6 max-h-[90vh] my-[5vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Détails du devis
                </h3>
                <button
                  onClick={() => setShowDevisModal(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-6">
                {/* Informations principales */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-[#335FAD] dark:text-[#335FAD]/80 mb-2">
                    {selectedDevisDetail.compagnie} - {selectedDevisDetail.produit}
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
                      <p className={`text-lg font-medium ${
                        selectedDevisDetail.economie_estimee && selectedDevisDetail.economie_estimee > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(selectedDevisDetail.economie_estimee || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Détails du prêt */}
                <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg p-4 border border-[#335FAD]/20 dark:border-[#335FAD]/80">
                  <h4 className="font-medium text-[#335FAD] dark:text-[#335FAD]/80 mb-3">
                    <i className="ri-file-text-line mr-2"></i>
                    Détails du prêt
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#335FAD]/80 dark:text-[#335FAD] mb-1">
                        Capital
                      </label>
                      <p className="text-[#335FAD] dark:text-[#335FAD]/80">
                        {formatCurrency(selectedDevisDetail.detail_pret.capital)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#335FAD]/80 dark:text-[#335FAD] mb-1">
                        Durée
                      </label>
                      <p className="text-[#335FAD] dark:text-[#335FAD]/80">
                        {selectedDevisDetail.detail_pret.duree} mois
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#335FAD]/80 dark:text-[#335FAD] mb-1">
                        Taux d'assurance
                      </label>
                      <p className="text-[#335FAD] dark:text-[#335FAD]/80">
                        {selectedDevisDetail.detail_pret.taux_assurance}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formalités médicales */}
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-3">
                    <i className="ri-heart-pulse-line mr-2"></i>
                    Formalités médicales
                  </h4>
                  {selectedDevisDetail.formalites_detaillees.map((formalite, index) => (
                    <div key={index} className="flex items-start mb-2 last:mb-0">
                      <i className="ri-arrow-right-s-line text-orange-600 dark:text-orange-400 mt-0.5"></i>
                      <p className="text-orange-800 dark:text-orange-300 ml-2">{formalite}</p>
                    </div>
                  ))}
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

                {/* Exclusions */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-error-warning-line mr-2 text-amber-500"></i>
                    Exclusions et limitations
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

                {/* Frais */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    <i className="ri-money-euro-circle-line mr-2 text-gray-500"></i>
                    Frais associés
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Frais d'adhésion
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatCurrency(selectedDevisDetail.frais_adhesion)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Frais de fractionnement
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatCurrency(selectedDevisDetail.frais_frac)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Coût total
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(selectedDevisDetail.cout_total_tarif)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer avec bouton */}
                <div className="mt-6">
                  {!selectedDevisDetail.selected && !selectedDevisDetail.refused && selectedDevisDetail.statut !== 'envoye' && (
                    <button
                      onClick={() => {
                        handleChoisirDevis(selectedDevisDetail.id);
                        setShowDevisModal(false);
                      }}
                      className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <i className="ri-check-line mr-2"></i>
                      Choisir ce devis
                    </button>
                  )}
                  
                  {selectedDevisDetail.statut === 'accepte' && (
                    <div className="text-center py-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800">
                      <i className="ri-check-double-line mr-2"></i>
                      Devis accepté par le client
                    </div>
                  )}
                  
                  {selectedDevisDetail.statut === 'envoye' && (
                    <div className="text-center py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-lg border border-orange-200 dark:border-orange-800">
                      <i className="ri-send-plane-line mr-2"></i>
                      Devis envoyé à l'apporteur
                    </div>
                  )}
                  
                  {selectedDevisDetail.selected && !selectedDevisDetail.refused && selectedDevisDetail.statut !== 'envoye' && selectedDevisDetail.statut !== 'accepte' && (
                    <div className="text-center py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                      <i className="ri-check-line mr-2"></i>
                      Devis sélectionné pour validation client
                    </div>
                  )}
                  
                  {selectedDevisDetail.refused && (
                    <div className="space-y-3">
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 p-3 text-center">
                        <i className="ri-close-line mr-2"></i>
                        <span className="font-medium">Refusé par le client</span>
                        <p className="text-sm mt-1">
                          motif : {selectedDevisDetail.motif_refus || '—'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleRenvoyerDevis(selectedDevisDetail.id)}
                        className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <i className="ri-send-plane-line mr-2"></i>
                        Renvoyer le devis
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offre_pret">Offre de Prêt</SelectItem>
                      <SelectItem value="tableau_amortissement">Tableau d'Amortissement</SelectItem>
                      <SelectItem value="carte_identite">Carte d'Identité (Emprunteur)</SelectItem>
                      {dossier.type === 'couple' && (
                        <SelectItem value="carte_identite_conjoint">Carte d'Identité (Conjoint)</SelectItem>
                      )}
                      <SelectItem value="bulletin_de_paie">Bulletin de Paie</SelectItem>
                      <SelectItem value="avis_imposition">Avis d'Imposition</SelectItem>
                      <SelectItem value="contrat_travail">Contrat de Travail</SelectItem>
                      <SelectItem value="autre">Autre Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fichier
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <i className="ri-upload-cloud-line text-gray-500 dark:text-gray-400 text-2xl mb-2"></i>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Cliquez pour télécharger</span> ou glissez-déposez
                        </p>
                      </div>
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowDocumentModal(false)}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Ajouter le document
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
                    onClick={() => handleDeleteDocument(documentToDelete || '')}
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
    </div>
  );
}
