'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DossiersService } from '@/lib/services/dossiers';
import { DevisService } from '@/lib/services/devis';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

// Interfaces pour les données du dossier
interface DossierClient {
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

interface DossierDocument {
  name: string;
  uploaded: boolean;
  url?: string;
  file_path?: string; // Chemin dans Supabase Storage
  file_size?: number;
  file_type?: string;
  uploaded_at?: string;
}

interface ProcessStep {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  date?: string;
  icon: string;
}

interface DevisInfo {
  id: string;
  compagnie: string;
  logo_compagnie?: string;
  cout_assurance: number;
  economies_estimees: number;
  duree_contrat: number;
  type_couverture: string;
  details_couverture: string[];
  date_creation: string;
  date_expiration: string;
  statut: 'disponible' | 'accepte' | 'refuse' | 'expire';
  motif_refus?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

interface DossierComplet {
  id: string;
  numeroDossier: string;
  type: 'seul' | 'couple';
  clientInfo: DossierClient;
  documents: {
    offrePret: DossierDocument | null;
    tableauAmortissement: DossierDocument | null;
    carteIdentite: DossierDocument | null;
    carteIdentiteConjoint?: DossierDocument | null;
  };
  statut: 'brouillon' | 'en_attente' | 'en_cours' | 'analyse' | 'devis_pret' | 'valide' | 'refuse';
  dateCreation: string;
  dateModification: string;
  completude: number;
  isDraft: boolean;
  processSteps: ProcessStep[];
  devis?: DevisInfo;
  devisList?: DevisInfo[]; // Liste de tous les devis
  commentaire?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface DossierDetailContentProps {
  dossierId: string;
}

export default function DossierDetailContent({ dossierId }: DossierDetailContentProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<DossierComplet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRefusing, setIsRefusing] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const REFUS_MOTIFS = [
    'Tarif trop élevé',
    'Couverture insuffisante',
    'Conditions contractuelles inadaptées',
    'Délai trop long',
    'Documents manquants',
    'Autre'
  ] as const;
  const [selectedRefusMotif, setSelectedRefusMotif] = useState<typeof REFUS_MOTIFS[number]>('Tarif trop élevé');
  // Nouvel état pour le suivi collapsible
  const [isProcessExpanded, setIsProcessExpanded] = useState(false);

  // États pour la commission de l'apporteur
  const [commissionInfo, setCommissionInfo] = useState<{
    type: 'percentage' | 'fixed';
    value: number; // % ou montant en euros
    estimatedAmount: number | null; // Montant estimé en euros (si devis disponible)
  } | null>(null);

  // Fonction principale pour récupérer le dossier complet depuis Supabase
  // État pour l'historique complet des devis
  const [devisHistory, setDevisHistory] = useState<any[]>([]);

  // Charger l'historique complet des devis
  useEffect(() => {
    (async () => {
      if (!dossier?.id) return;
      try {
        const history = await DossiersService.getDevisApporteurHistory(dossier.id);
        setDevisHistory(history);
      } catch (e) {
        console.error('[ApporteurDetail] Erreur chargement historique devis:', e);
      }
    })();
  }, [dossier?.id]);

  // Charger les informations de commission de l'apporteur
  useEffect(() => {
    const fetchCommissionInfo = async () => {
      if (!user?.id) return;
      
      try {
        // Récupérer le profil apporteur
        const { data: apporteurProfile } = await supabase
          .from('apporteur_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!apporteurProfile) return;

        // Récupérer la relation broker_apporteurs avec les infos de commission
        const { data: brokerApporteur } = await supabase
          .from('broker_apporteurs')
          .select('broker_id, custom_share_pct, custom_fixed_amount')
          .eq('apporteur_profile_id', apporteurProfile.id)
          .single();

        if (!brokerApporteur) return;

        // Récupérer les paramètres par défaut du broker
        const { data: brokerSettings } = await supabase
          .from('broker_commission_settings')
          .select('default_apporteur_share_pct, default_apporteur_fixed_amount, default_frais_courtier')
          .eq('broker_id', brokerApporteur.broker_id)
          .single();

        // Déterminer le type et la valeur de commission
        let type: 'percentage' | 'fixed' = 'percentage';
        let value = 80; // défaut

        if (brokerApporteur.custom_fixed_amount !== null) {
          type = 'fixed';
          value = brokerApporteur.custom_fixed_amount / 100; // centimes -> euros
        } else if (brokerApporteur.custom_share_pct !== null) {
          type = 'percentage';
          value = brokerApporteur.custom_share_pct;
        } else if (brokerSettings?.default_apporteur_fixed_amount !== null && brokerSettings?.default_apporteur_fixed_amount !== undefined) {
          type = 'fixed';
          value = brokerSettings.default_apporteur_fixed_amount / 100;
        } else if (brokerSettings?.default_apporteur_share_pct !== null && brokerSettings?.default_apporteur_share_pct !== undefined) {
          type = 'percentage';
          value = brokerSettings.default_apporteur_share_pct;
        }

        // Calculer le montant estimé si on a un devis avec des frais de courtage
        let estimatedAmount: number | null = null;
        if (type === 'fixed') {
          estimatedAmount = value;
        } else if (brokerSettings?.default_frais_courtier) {
          // Pour le pourcentage, calculer basé sur les frais par défaut
          estimatedAmount = (brokerSettings.default_frais_courtier / 100) * (value / 100);
        }

        setCommissionInfo({ type, value, estimatedAmount });
      } catch (error) {
        console.error('Erreur chargement commission:', error);
      }
    };

    fetchCommissionInfo();
  }, [user?.id]);

  const fetchDossier = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data: any = await DossiersService.getDossierById(dossierId);

      if (!data) {
        setError('Dossier introuvable');
        setDossier(null);
        return;
      }

      // Mapping DB -> UI
      const ci = Array.isArray(data.client_infos) ? data.client_infos[0] : null;
      const pd = Array.isArray(data.pret_data) ? data.pret_data[0] : null;
      const allDevis = Array.isArray(data.devis) ? data.devis : [];
      // Filtrer seulement les devis envoyés, acceptés ou refusés (pas les devis en attente)
      const devisList = allDevis.filter((d: any) => 
        d.statut === 'envoye' || d.statut === 'accepte' || d.statut === 'refuse'
      );
      const devis = devisList.length > 0 ? devisList[0] : null; // Premier devis pour compatibilité
      const steps = Array.isArray(data.process_steps) ? data.process_steps : [];
      const docs = Array.isArray(data.documents) ? data.documents : [];

      const mappedBase: DossierComplet = {
        id: data.id,
        numeroDossier: data.numero_dossier,
        type: (data.type_dossier === 'couple' ? 'couple' : 'seul'),
        user_id: data.apporteur_id || '',
        created_at: data.created_at || data.date_creation || '',
        updated_at: data.updated_at || '',
        clientInfo: {
          nom: ci?.client_nom || '',
          prenom: ci?.client_prenom || '',
          dateNaissance: ci?.client_date_naissance || '',
          profession: ci?.client_profession || '',
          revenus: pd?.montant_capital ? String(pd?.montant_capital) : '',
          fumeur: !!ci?.client_fumeur,
          email: ci?.client_email || '',
          telephone: ci?.client_telephone || '',
          adresse: ci?.client_adresse || '',
          conjoint: ci?.conjoint_nom
            ? {
                nom: ci.conjoint_nom,
                prenom: ci.conjoint_prenom || '',
                dateNaissance: ci.conjoint_date_naissance || '',
                profession: ci.conjoint_profession || '',
                revenus: ci?.conjoint_revenus || '',
                fumeur: !!ci.conjoint_fumeur,
              }
            : undefined,
        },
        documents: mapDocsApporteur(docs),
        statut: (data.statut as any) || 'en_attente',
        dateCreation: data.date_creation || data.created_at || '',
        dateModification: data.updated_at || '',
        completude: 0,
        isDraft: false,
        processSteps: [],
        devis: devis
          ? {
              id: devis.id,
              compagnie: 'Assureur',
              cout_assurance: 0,
              economies_estimees: Number(data.economie_generee) || 0,
              duree_contrat: 0,
              type_couverture: 'Devis',
              details_couverture: [],
              date_creation: devis.date_generation || devis.created_at || '',
              date_expiration: devis.date_expiration || '',
              statut: devis.statut === 'accepte' ? 'accepte' : devis.statut === 'refuse' ? 'refuse' : devis.statut === 'envoye' ? 'disponible' : 'disponible',
              motif_refus: (devis.donnees_devis as any)?.motif_refus || devis.motif_refus,
              pdf_url: devis.pdf_url || undefined,
              created_at: devis.created_at || '',
              updated_at: devis.updated_at || '',
            }
          : undefined,
        devisList: devisList.map((d: any) => ({
          id: d.id,
          compagnie: (d.donnees_devis as any)?.compagnie || 'Assureur',
          cout_assurance: (d.donnees_devis as any)?.mensualite || 0,
          economies_estimees: (d.donnees_devis as any)?.economie_estimee || Number(data.economie_generee) || 0,
          duree_contrat: 0,
          type_couverture: 'Devis',
          details_couverture: [],
          date_creation: d.date_generation || d.created_at || '',
          date_expiration: d.date_expiration || '',
          statut: d.statut === 'accepte' ? 'accepte' : d.statut === 'refuse' ? 'refuse' : d.statut === 'envoye' ? 'disponible' : 'disponible',
          motif_refus: (d.donnees_devis as any)?.motif_refus || d.motif_refus,
          pdf_url: d.pdf_url || undefined,
          created_at: d.created_at || '',
          updated_at: d.updated_at || '',
        })),
        // Motif de refus (depuis la DB ou depuis le JSON du devis refusé)
        commentaire: (data as any)?.commentaire || ((devis as any)?.donnees_devis && typeof (devis as any).donnees_devis === 'object' ? (devis as any).donnees_devis.motif_refus : undefined),
      };

      // Construire les étapes canoniques: toujours visibles
      const canonicalSteps = [
        { key: 'received', label: 'Dossier reçu', icon: 'ri-file-check-line', description: 'Votre dossier a été reçu et vérifié' },
        { key: 'analysis', label: 'Analyse IA', icon: 'ri-robot-line', description: 'Extraction automatique des informations' },
        { key: 'gmb', label: 'Traitement GMB', icon: 'ri-user-search-line', description: 'Analyse par nos experts courtiers' },
        { key: 'quote', label: 'Devis disponible', icon: 'ri-file-text-line', description: 'Votre devis personnalisé apparaîtra ici' },
        { key: 'validation', label: 'Validation client', icon: 'ri-checkbox-circle-line', description: 'En attente de votre validation' },
        { key: 'final', label: 'Finalisation', icon: 'ri-award-line', description: 'Mise en place du contrat' },
      ];

      // Déterminer l'étape courante selon la DB
      const dbStatut: string = (data.statut || '').toLowerCase();
      let currentIdx = 0;
      let errorIdx: number | null = null;
      if (dbStatut === 'finalisé' || dbStatut === 'finalise' || dbStatut === 'finalise') currentIdx = 5;
      else if (dbStatut === 'devis_accepte' || dbStatut === 'valide') currentIdx = 4;
      else if (dbStatut === 'devis_envoye' || devis) currentIdx = 3;
      else if (dbStatut === 'en_attente' || !dbStatut) currentIdx = 0;
      else if (dbStatut === 'refusé' || dbStatut === 'refuse') { currentIdx = 4; errorIdx = 4; }

      // Si la table process_steps existe, injecter dates si disponibles
      const datesByKey: Record<string, string | undefined> = {};
      if (Array.isArray(steps)) {
        steps.forEach((s: any) => {
          const name = (s.step_name || '').toLowerCase();
          const completedAt = s.completed_at || s.started_at || undefined;
          if (name.includes('reçu')) datesByKey.received = completedAt;
          else if (name.includes('analyse')) datesByKey.analysis = completedAt;
          else if (name.includes('gmb') || name.includes('traitement')) datesByKey.gmb = completedAt;
          else if (name.includes('devis')) datesByKey.quote = completedAt;
          else if (name.includes('validation')) datesByKey.validation = completedAt;
          else if (name.includes('final')) datesByKey.final = completedAt;
        });
      }

      const mappedSteps: ProcessStep[] = canonicalSteps.map((s, idx) => {
        const status: ProcessStep['status'] = errorIdx === idx
          ? 'error'
          : (idx < currentIdx ? 'completed' : idx === currentIdx ? 'current' : 'pending');
        return {
          id: s.key,
          label: s.label,
          description: s.description,
          status,
          date: datesByKey[s.key],
          icon: s.icon,
        };
      });

      // Rétro-compat: si un devis existant est déjà refusé/accepté/envoyé, refléter sur le statut dossier
      let effectiveStatut: string = mappedBase.statut as any;
      if (devis && typeof devis.statut === 'string' && effectiveStatut !== 'finalise') {
        const ds = devis.statut.toLowerCase();
        if (ds === 'refuse') {
          effectiveStatut = 'refuse';
        } else if (ds === 'accepte') {
          effectiveStatut = 'valide';
        } else if (ds === 'envoye') {
          // utiliser 'devis_pret' (alias typé) pour afficher "Devis disponible"
          effectiveStatut = 'devis_pret';
        } else if (ds === 'en_attente' || ds === 'lu') {
          effectiveStatut = 'devis_pret';
        }
      }

      const mapped: DossierComplet = { ...mappedBase, statut: effectiveStatut as any, processSteps: mappedSteps };

      setDossier(mapped);
    } catch (e) {
      console.error('Erreur lors du chargement du dossier:', e);
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  function mapDocsApporteur(rows: any[]) {
    const findAny = (types: string[]) => rows.find((d: any) => types.includes(d.document_type));
    const toDoc = (row?: any): DossierDocument | null => row ? {
      name: row.document_name,
      uploaded: true,
      url: row.storage_path,
      file_path: row.storage_path,
      file_size: row.file_size,
      file_type: row.mime_type,
      uploaded_at: row.created_at,
    } : null;
    return {
      offrePret: toDoc(findAny(['offre_pret','offrePret'])),
      tableauAmortissement: toDoc(findAny(['tableau_amortissement','tableauAmortissement'])),
      carteIdentite: toDoc(findAny(['carte_identite','carteIdentite','cni'])),
      carteIdentiteConjoint: toDoc(findAny(['carte_identite_conjoint','carteIdentiteConjoint','cni_conjoint'])),
    };
  }

  // Fonction pour valider le devis
  const handleValidateDevis = async () => {
    if (!dossier?.devis || !dossier?.id) return;

    setIsValidating(true);
    try {
      console.log('[handleValidateDevis] start', { devisId: dossier.devis.id, dossierId: dossier.id })
      await DevisService.markDevisAsAccepted(dossier.devis.id);
      await DossiersService.updateDossier(dossier.id, { statut: 'devis_accepte' as any });
      console.log('[handleValidateDevis] success persist, refetch dossier')

      // Rafraîchir depuis la DB pour refléter le statut exact
      const fresh: any = await DossiersService.getDossierById(dossier.id);
      if (fresh) {
        setDossier(prev => prev ? { ...prev, statut: fresh.statut, devis: prev.devis ? { ...prev.devis, statut: 'accepte' } : undefined } : prev);
      } else {
        // fallback local
        setDossier(prev => prev ? { ...prev, statut: 'valide', devis: prev.devis ? { ...prev.devis, statut: 'accepte' } : undefined } : prev);
      }
      alert('Devis validé avec succès !');
    } catch (e) {
      console.error('[handleValidateDevis] error', e);
      alert('Erreur lors de la validation du devis');
    } finally {
      setIsValidating(false);
    }
  };

  // Fonction pour refuser le devis
  const handleRefuseDevis = async () => {
    if (!dossier?.devis || !dossier?.id) return;

    const finalReason = selectedRefusMotif !== 'Autre' ? selectedRefusMotif : refuseReason.trim();
    if (!finalReason) return;

    setIsRefusing(true);
    try {
      console.log('[handleRefuseDevis] start', { devisId: dossier.devis.id, dossierId: dossier.id, selectedRefusMotif, finalReason })
      await DevisService.markDevisAsRejected(dossier.devis.id, finalReason);
      await DossiersService.updateDossier(dossier.id, { statut: 'refuse' as any, commentaire: finalReason as any });
      console.log('[handleRefuseDevis] success persist, refetch dossier')

      // Rafraîchir depuis la DB pour refléter le statut exact
      const fresh: any = await DossiersService.getDossierById(dossier.id);
      if (fresh) {
        setDossier(prev => prev ? { ...prev, statut: fresh.statut, commentaire: finalReason, devis: prev.devis ? { ...prev.devis, statut: 'refuse' } : undefined } : prev);
      } else {
        // fallback local
        setDossier(prev => prev ? { ...prev, statut: 'refuse', commentaire: finalReason, devis: prev.devis ? { ...prev.devis, statut: 'refuse' } : undefined } : prev);
      }

      setShowRefuseModal(false);
      setRefuseReason('');
      setSelectedRefusMotif('Tarif trop élevé');
      alert('Devis refusé. Votre motif a été enregistré.');
    } catch (e) {
      console.error('[handleRefuseDevis] error', e);
      alert('Erreur lors du refus du devis');
    } finally {
      setIsRefusing(false);
    }
  };

  // Fonction pour générer et télécharger le PDF
  const handleDownloadPDF = async () => {
    if (!dossier?.devis) return;

    setIsGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Le PDF sera téléchargé une fois Supabase intégré');
    } catch (e) {
      console.error('Erreur lors de la génération du PDF:', e);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Fonction pour partager le devis par email
  const handleShareDevis = () => {
    if (!dossier) return;

    const subject = encodeURIComponent('Devis assurance emprunteur - ' + dossier.numeroDossier);
    const bodyLines = [
      'Bonjour,',
      '',
      "Voici votre devis d'assurance emprunteur personnalisé :",
      '',
      'Dossier : ' + dossier.numeroDossier,
      'Compagnie : ' + (dossier.devis?.compagnie ?? ''),
      'Coût mensuel : ' + (dossier.devis?.cout_assurance ?? '') + '€',
      'Économies estimées : ' + (dossier.devis?.economies_estimees ?? '') + '€',
      '',
      'Le devis détaillé est disponible en pièce jointe.',
      '',
      'Cordialement,',
      'GMB Courtage',
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = 'mailto:' + dossier.clientInfo.email + '?subject=' + subject + '&body=' + body;
  };

  const buildPublicUrl = (key: string) => {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    return `${base}/storage/v1/object/public/documents/${key}`
  }

  useEffect(() => {
    if (dossierId) {
      fetchDossier();
    }
  }, [dossierId]);

  // ✅ Utilisation du formatter centralisé depuis lib/utils/formatters.ts

  // Formatage des montants
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Configuration des statuts (normalisée, cohérente avec la liste)
  const getStatutConfig = (statut: string) => {
    const key = (statut || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    switch (key) {
      case 'en_attente':
      case 'nouveau':
      case 'dossier_envoye':
        return {
          label: 'Dossier envoyé',
          icon: 'ri-send-plane-line',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-700 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-700',
        };
      case 'devis_genere':
      case 'devis_disponible':
      case 'devis_pret':
        return {
          label: 'Devis disponible',
          icon: 'ri-file-text-line',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
          textColor: 'text-indigo-700 dark:text-indigo-400',
          borderColor: 'border-indigo-200 dark:border-indigo-700',
        };
      case 'devis_envoye':
        return {
          label: 'Devis envoyé',
          icon: 'ri-mail-line',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          textColor: 'text-orange-700 dark:text-orange-400',
          borderColor: 'border-orange-200 dark:border-orange-700',
        };
      case 'devis_accepte':
      case 'valide':
        return {
          label: 'Devis accepté',
          icon: 'ri-check-line',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-400',
          borderColor: 'border-green-200 dark:border-green-700',
        };
      case 'finalise':
      case 'finalisee':
      case 'finalises':
      case 'finalisees':
        return {
          label: 'Finalisé',
          icon: 'ri-check-double-line',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          textColor: 'text-purple-700 dark:text-purple-400',
          borderColor: 'border-purple-200 dark:border-purple-700',
        };
      case 'refuse':
      case 'refusee':
      case 'refuses':
      case 'refusees':
        return {
          label: 'Refusé',
          icon: 'ri-close-line',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-700 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-700',
        };
      default:
        return {
          label: 'Inconnu',
          icon: 'ri-question-line',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dossier...</p>
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Dossier introuvable
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || "Ce dossier n'existe pas ou vous n'avez pas les droits pour y accéder."}
          </p>
          <Link
            href="/mes-dossiers"
            className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center space-x-2"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Retour aux dossiers</span>
          </Link>
        </div>
      </div>
    );
  }

  const statutConfig = getStatutConfig(dossier.statut);

  // Classes pour le badge de statut du devis (extraites pour simplifier le JSX)
  const devisStatusBadgeClasses = (() => {
    if ((dossier.statut as any) === 'finalise') {
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    }
    if (!dossier.devis) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    if (dossier.devis.statut === 'disponible') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (dossier.devis.statut === 'accepte') return 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  })();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/mes-dossiers"
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
              </Link>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white">
                    {dossier.numeroDossier}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statutConfig.bgColor} ${statutConfig.textColor} ${statutConfig.borderColor}`}
                  >
                    <i className={`${statutConfig.icon} mr-1`}></i>
                    {statutConfig.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dossier.clientInfo.prenom} {dossier.clientInfo.nom}
                  {dossier.type === 'couple' && dossier.clientInfo.conjoint && (
                    <span>
                      {' '}&amp; {dossier.clientInfo.conjoint.prenom} {dossier.clientInfo.conjoint.nom}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-8">
            {/* Barre de progression du processus - Version collapsible */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center">
                  <i className="ri-roadmap-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                  Suivi du dossier
                </h2>
                <button
                  onClick={() => setIsProcessExpanded(!isProcessExpanded)}
                  className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium cursor-pointer flex items-center space-x-1"
                >
                  <span>{isProcessExpanded ? 'Masquer' : 'Afficher tout'}</span>
                  <i className={`ri-arrow-${isProcessExpanded ? 'up' : 'down'}-s-line`}></i>
                </button>
              </div>

              <div className="space-y-4">
                {dossier.processSteps.map((step, index) => {
                  const currentStepIndex = dossier.processSteps.findIndex(s => s.status === 'current');
                  const isCurrentStep = step.status === 'current';
                  const shouldShow =
                    isProcessExpanded ||
                    isCurrentStep ||
                    (currentStepIndex === -1 && index === dossier.processSteps.length - 1);
                  if (!shouldShow) return null;

                  return (
                    <div key={step.id} className="flex items-start space-x-4">
                      {/* Icône et ligne */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            step.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : step.status === 'current'
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-[#335FAD] dark:text-[#335FAD]/80'
                              : step.status === 'error'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <i className={`${step.icon} text-sm`}></i>
                        </div>
                        {isProcessExpanded && index < dossier.processSteps.length - 1 && (
                          <div
                            className={`w-0.5 h-8 mt-2 ${
                              step.status === 'completed' ? 'bg-green-200 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                          ></div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`font-medium ${
                              step.status === 'completed' || step.status === 'current'
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {step.label}
                          </h3>
                          {step.date && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(step.date, true)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {step.description}
                        </p>
                        {step.status === 'current' && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                              <span className="text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-medium">
                                En cours
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section Devis */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center">
                    <i className="ri-file-text-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                    Devis personnalisé
                  </h2>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${devisStatusBadgeClasses}`}
                >
                    {dossier.devis
                      ? dossier.devis.statut === 'disponible'
                        ? 'Disponible'
                        : dossier.devis.statut === 'accepte'
                        ? 'Accepté'
                        : 'Refusé'
                      : 'En préparation'}
                  </span>
                </div>

                {!dossier.devis ? (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-full bg-[#335FAD]/10 dark:bg-[#335FAD]/20 flex items-center justify-center flex-shrink-0">
                        <i className="ri-time-line text-[#335FAD] dark:text-[#335FAD]"></i>
                      </div>
                      <div>
                        <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">Votre devis sera affiché ici</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Nos agents GMB Courtage travaillent actuellement sur votre dossier. Vous serez notifié dès que votre devis personnalisé sera disponible.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Infos du devis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Compagnie */}
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        {dossier.devis.logo_compagnie && (
                    <img
                      src={dossier.devis.logo_compagnie}
                      alt={dossier.devis.compagnie}
                      className="w-16 h-8 object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                        )}
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Compagnie</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dossier.devis.compagnie}
                      </p>
                    </div>
                  </div>

                  {/* Coût mensuel */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coût mensuel</p>
                    <p className="text-2xl font-light text-gray-900 dark:text-white">
                      {formatAmount(dossier.devis.cout_assurance)}
                    </p>
                  </div>

                  {/* Économies */}
                  <div className="md:col-span-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Économies estimées sur la durée
                        </p>
                        <p className="text-3xl font-light text-green-700 dark:text-green-400">
                          {formatAmount(dossier.devis.economies_estimees)}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <i className="ri-money-euro-circle-line text-green-600 dark:text-green-400 text-2xl"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Détails de couverture */}
                    {dossier.devis.details_couverture?.length ? (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    {dossier.devis.type_couverture}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dossier.devis.details_couverture.map((garantie, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <i className="ri-check-line text-green-600 dark:text-green-400 text-sm"></i>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{garantie}</span>
                      </div>
                    ))}
                  </div>
                </div>
                    ) : null}
                  </>
                )}
              </div>


                {/* Actions du devis - Couleurs ajustées */}
                {dossier.devis && dossier.devis.statut === 'disponible' && dossier.statut !== 'refuse' && (
                  <div className="space-y-4">
                    {/* Partage et téléchargement - Couleurs moins prononcées */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingPDF ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-download-line"></i>
                            <span>Télécharger PDF</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleShareDevis}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <i className="ri-share-line"></i>
                        <span>Partager</span>
                      </button>
                    </div>

                    {/* Validation / Refus - Couleurs éclaircies */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleValidateDevis}
                        disabled={isValidating}
                        className="flex-1 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Validation...</span>
                          </>
                        ) : (
                          <>
                            <i className="ri-check-line"></i>
                            <span>Valider la proposition</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowRefuseModal(true)}
                        className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <i className="ri-close-line"></i>
                        <span>Refuser la proposition</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Affichage après validation/refus */}
                {dossier.devis && (dossier.devis.statut !== 'disponible' || dossier.statut === 'refuse') && (
                  <div
                    className={`p-4 rounded-xl ${
                      dossier.devis.statut === 'accepte'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <i
                        className={`${
                          dossier.devis.statut === 'accepte'
                            ? 'ri-check-circle-line text-green-600 dark:text-green-400'
                            : 'ri-close-circle-line text-red-600 dark:text-red-400'
                        } text-xl`}
                      ></i>
                      <div>
                        <p
                          className={`font-medium ${
                            dossier.devis.statut === 'accepte'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {dossier.devis.statut === 'accepte' ? 'Devis accepté' : 'Devis refusé'}
                        </p>
                        <p
                          className={`text-sm ${
                            dossier.devis.statut === 'accepte'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {dossier.devis.statut === 'accepte'
                            ? 'GMB Courtage procède à la finalisation de votre contrat'
                            : 'Votre retour a été transmis à GMB Courtage'}
                        </p>
                      </div>
                    </div>
                    {dossier.commentaire && dossier.devis.statut === 'refuse' && (
                      <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          <strong>Raison du refus :</strong> {dossier.commentaire}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
          
          
          {/* Colonne latérale */}
          <div className="space-y-8">
            {/* Ma Commission - Visible pour l'apporteur */}
            {commissionInfo && (
              <div className="bg-gradient-to-br from-[#335FAD]/5 to-purple-500/5 dark:from-[#335FAD]/10 dark:to-purple-500/10 rounded-2xl p-6 border border-[#335FAD]/20 dark:border-[#335FAD]/30">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                  <i className="ri-wallet-3-line mr-3 text-[#335FAD]"></i>
                  Ma commission
                </h3>
                
                <div className="space-y-4">
                  {/* Type de commission */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {commissionInfo.type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
                    </span>
                  </div>

                  {/* Valeur */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {commissionInfo.type === 'percentage' ? 'Taux' : 'Montant par dossier'}
                    </span>
                    <span className="text-lg font-semibold text-[#335FAD]">
                      {commissionInfo.type === 'percentage' 
                        ? `${commissionInfo.value}%`
                        : formatCurrency(commissionInfo.value)
                      }
                    </span>
                  </div>

                  {/* Estimation si pourcentage */}
                  {commissionInfo.type === 'percentage' && commissionInfo.estimatedAmount !== null && (
                    <div className="pt-3 border-t border-[#335FAD]/20 dark:border-[#335FAD]/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Estimation*</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          ~{formatCurrency(commissionInfo.estimatedAmount)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        *Basé sur les frais de courtage moyens
                      </p>
                    </div>
                  )}

                  {/* Info statut si devis accepté */}
                  {dossier?.devis?.statut === 'accepte' && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center">
                        <i className="ri-check-double-line mr-2"></i>
                        Commission en cours de traitement après finalisation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informations client */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <i className="ri-user-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                Informations client
              </h3>

              <div className="space-y-4">
                {/* Emprunteur principal */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {dossier.type === 'couple' ? 'Emprunteur principal' : 'Emprunteur'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Nom :</span>
                      <span className="text-gray-900 dark:text-white">
                        {dossier.clientInfo.prenom} {dossier.clientInfo.nom}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Naissance :</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(dossier.clientInfo.dateNaissance).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Profession :</span>
                      <span className="text-gray-900 dark:text-white">{dossier.clientInfo.profession}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Revenus :</span>
                      <span className="text-gray-900 dark:text-white">
                        {dossier.clientInfo.revenus}€/mois
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Fumeur :</span>
                      <span className="text-gray-900 dark:text-white">
                        {dossier.clientInfo.fumeur ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Email :</span>
                      <span className="text-gray-900 dark:text-white">{dossier.clientInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Téléphone :</span>
                      <span className="text-gray-900 dark:text-white">{dossier.clientInfo.telephone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Adresse :</span>
                      <span className="text-gray-900 dark:text-white">{dossier.clientInfo.adresse}</span>
                    </div>
                  </div>
                </div>

                {/* Conjoint (si présent) */}
                {dossier.type === 'couple' && dossier.clientInfo.conjoint && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Conjoint</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Nom :</span>
                        <span className="text-gray-900 dark:text-white">
                          {dossier.clientInfo.conjoint.prenom} {dossier.clientInfo.conjoint.nom}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Naissance :</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(dossier.clientInfo.conjoint.dateNaissance).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Profession :</span>
                        <span className="text-gray-900 dark:text-white">{dossier.clientInfo.conjoint.profession}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Revenus :</span>
                        <span className="text-gray-900 dark:text-white">
                          {dossier.clientInfo.conjoint.revenus}€/mois
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Fumeur :</span>
                        <span className="text-gray-900 dark:text-white">
                          {dossier.clientInfo.conjoint.fumeur ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nouvelle card : Documents joints */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <i className="ri-file-list-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                Documents joints
              </h3>

              <div className="space-y-3">
                {/* Offre de prêt */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      dossier.documents.offrePret 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                    }`}>
                      <i className="ri-file-text-line text-sm"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Offre de Prêt</p>
                      {dossier.documents.offrePret ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={dossier.documents.offrePret.name}>
                          {dossier.documents.offrePret.name}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 dark:text-red-400">Non fourni</p>
                      )}
                    </div>
                  </div>
                  {dossier.documents.offrePret && (
                    <button
                      onClick={() => window.open(buildPublicUrl(dossier.documents.offrePret!.url!), '_blank')}
                      className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex-shrink-0 ml-2"
                      title="Consulter le document"
                    >
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                  )}
                </div>

                {/* Tableau d'amortissement */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      dossier.documents.tableauAmortissement 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                    }`}>
                      <i className="ri-table-line text-sm"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Tableau d'Amortissement</p>
                      {dossier.documents.tableauAmortissement ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={dossier.documents.tableauAmortissement.name}>
                          {dossier.documents.tableauAmortissement.name}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 dark:text-red-400">Non fourni</p>
                      )}
                    </div>
                  </div>
                  {dossier.documents.tableauAmortissement && (
                    <button
                      onClick={() => window.open(buildPublicUrl(dossier.documents.tableauAmortissement!.url!), '_blank')}
                      className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex-shrink-0 ml-2"
                      title="Consulter le document"
                    >
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                  )}
                </div>

                {/* Carte d'identité emprunteur */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      dossier.documents.carteIdentite 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                    }`}>
                      <i className="ri-id-card-line text-sm"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Carte d'Identité</p>
                      {dossier.documents.carteIdentite ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={dossier.documents.carteIdentite.name}>
                          {dossier.documents.carteIdentite.name}
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 dark:text-red-400">Non fourni</p>
                      )}
                    </div>
                  </div>
                  {dossier.documents.carteIdentite && (
                    <button
                      onClick={() => window.open(buildPublicUrl(dossier.documents.carteIdentite!.url!), '_blank')}
                      className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex-shrink-0 ml-2"
                      title="Consulter le document"
                    >
                      <i className="ri-eye-line text-sm"></i>
                    </button>
                  )}
                </div>

                {/* Carte d'identité conjoint (si présente) */}
                {dossier.type === 'couple' && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        dossier.documents.carteIdentiteConjoint 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                      }`}>
                        <i className="ri-id-card-line text-sm"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Carte d'Identité (Conjoint)</p>
                        {dossier.documents.carteIdentiteConjoint ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={dossier.documents.carteIdentiteConjoint.name}>
                            {dossier.documents.carteIdentiteConjoint.name}
                          </p>
                        ) : (
                          <p className="text-xs text-red-500 dark:text-red-400">Non fourni</p>
                        )}
                      </div>
                    </div>
                    {dossier.documents.carteIdentiteConjoint && (
                      <button
                        onClick={() => window.open(buildPublicUrl(dossier.documents.carteIdentiteConjoint!.url!), '_blank')}
                        className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer flex-shrink-0 ml-2"
                        title="Consulter le document"
                      >
                        <i className="ri-eye-line text-sm"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Résumé des documents */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Documents fournis :</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {[
                      dossier.documents.offrePret,
                      dossier.documents.tableauAmortissement,
                      dossier.documents.carteIdentite,
                      dossier.documents.carteIdentiteConjoint
                    ].filter(Boolean).length}{' '}
                    / {dossier.type === 'couple' ? 4 : 3}
                  </span>
                </div>
              </div>
            </div>

            {/* Historique des devis */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6 flex items-center">
                <i className="ri-history-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                Historique des devis
              </h2>
              
              {devisHistory && devisHistory.length > 0 ? (
                <div className="space-y-3">
                  {devisHistory.map((devisItem, index) => (
                    <div 
                      key={`${devisItem.devis_id}-${devisItem.action_type}-${index}`}
                      className={`p-4 rounded-xl border transition-colors ${
                        devisItem.action_type === 'accepte'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          : devisItem.action_type === 'refuse'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            devisItem.action_type === 'accepte'
                              ? 'bg-green-500'
                              : devisItem.action_type === 'refuse'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {devisItem.compagnie} - {devisItem.numero_devis}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatAmount(devisItem.cout_mensuel)}/mois • Économies: {formatAmount(devisItem.economie_estimee || 0)}
                            </p>
                            {devisItem.action_date && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {devisItem.action_type === 'refuse' ? 'Refusé le' :
                                 devisItem.action_type === 'accepte' ? 'Accepté le' : 'Le'} {formatDate(devisItem.action_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {devisItem.action_type === 'accepte' && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                              Accepté
                            </span>
                          )}
                          {devisItem.action_type === 'refuse' && (
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-full text-xs font-medium">
                              Refusé
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Affichage du motif de refus si le devis est refusé */}
                      {devisItem.action_type === 'refuse' && devisItem.motif_refus && (
                        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700">
                          <p className="text-sm text-red-700 dark:text-red-300">
                            <span className="font-medium">motif :</span> {devisItem.motif_refus}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
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
      </main>

      {/* Modal de refus */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Refuser le devis
            </h3>
            <div className="space-y-3 mb-3">
              <label className="block text-sm text-gray-700 dark:text-gray-300">Motif</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-between p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                    <span>{selectedRefusMotif}</span>
                    <i className="ri-arrow-down-s-line"></i>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuLabel>Choisir un motif</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {REFUS_MOTIFS.map(m => (
                    <DropdownMenuItem key={m} onClick={() => setSelectedRefusMotif(m)}>
                      {m}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {selectedRefusMotif === 'Autre' && (
              <textarea
                value={refuseReason}
                onChange={e => setRefuseReason(e.target.value)}
                placeholder="Préciser le motif..."
                className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowRefuseModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuseDevis}
                disabled={isRefusing || (selectedRefusMotif === 'Autre' && !refuseReason.trim())}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefusing ? 'Envoi...' : 'Valider le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
