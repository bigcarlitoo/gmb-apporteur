
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ApporteursService } from '@/lib/services/apporteurs';
import { mapStatutForDisplay, getStatutBadgeConfig } from '@/lib/utils/statut-mapping';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { getApporteurBadgeConfig } from '@/lib/utils/apporteur-badges';
import { supabase } from '@/lib/supabase';

// ============================================================================
// INTERFACES POUR L'INTÉGRATION SUPABASE
// ============================================================================

// Interface pour les données d'un apporteur - Table 'apporteur_profiles'
interface ApporteurProfile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  // Inscription et statut
  date_inscription: string;
  statut: 'actif' | 'inactif' | 'suspendu' | 'en_attente' | 'refuse';
  // Données calculées
  nb_dossiers_traites: number;
  nb_dossiers_en_cours: number;
  nb_dossiers_valides: number;
  economies_generees: number;
  taux_conversion: number;
  // Métadonnées
  created_at: string;
  updated_at: string;
  last_login: string;
}

// Interface pour les statistiques détaillées d'un apporteur
interface ApporteurStatistics {
  // Performance mensuelle
  performance_mensuelle: {
    mois: string;
    dossiers_traites: number;
    dossiers_valides: number;
    economies_generees: number;
    ca_gmb: number;
  }[];
  // Répartition par type de dossier
  repartition_types: {
    type: string;
    nombre: number;
    pourcentage: number;
  }[];
  // Clients récents
  clients_recents: {
    id: string;
    nom: string;
    prenom: string;
    date_soumission: string;
    statut: string;
    economie: number;
    montant_capital: number;
    is_couple: boolean;
  }[];
}

// Interface pour un dossier dans la modale mensuelle
interface DossierMensuel {
  id: string;
  numero: string;
  client_nom: string;
  client_prenom: string;
  date_soumission: string;
  statut: 'nouveau' | 'devis_envoye' | 'valide' | 'refuse' | 'finalise';
  montant_capital: number;
  economie_generee: number;
  ca_gmb: number;
  type_assurance: string;
  is_couple: boolean;
}

interface ApporteurDetailContentProps {
  apporteurId: string;
}

export default function ApporteurDetailContent({ apporteurId }: ApporteurDetailContentProps) {
  const router = useRouter();
  const [apporteur, setApporteur] = useState<ApporteurProfile | null>(null);
  const [statistics, setStatistics] = useState<ApporteurStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubject, setContactSubject] = useState(''); // NOUVEAU: Champ objet du contact

  // Nouveaux états pour les filtres de performance
  const [performancePeriod, setPerformancePeriod] = useState<'6mois' | '12mois' | '24mois' | 'tout'>('12mois');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthlyDossiers, setMonthlyDossiers] = useState<DossierMensuel[]>([]);
  const [loadingMonthlyData, setLoadingMonthlyData] = useState(false);

  // États pour la commission personnalisée
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [customSharePct, setCustomSharePct] = useState<number | null>(null);
  const [customFixedAmount, setCustomFixedAmount] = useState<number | null>(null); // en euros
  const [useCustomShare, setUseCustomShare] = useState(false);
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [defaultSharePct, setDefaultSharePct] = useState<number>(80);
  const [defaultFixedAmount, setDefaultFixedAmount] = useState<number | null>(null); // en euros
  const [defaultCommissionType, setDefaultCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionSaveSuccess, setCommissionSaveSuccess] = useState(false);


  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DES DONNÉES APPORTEUR
  // ============================================================================

  /**
   * FONCTION DE RÉCUPÉRATION COMPLÈTE DES DONNÉES APPORTEUR
   * 
   * Cette fonction doit récupérer depuis Supabase :
   * 1. Les informations du profil apporteur
   * 2. Les statistiques calculées (nombre de dossiers, économies, etc.)
   * 3. L'historique de performance
   * 
   * Requête SQL principale :
   * ```sql
   * SELECT 
   *   ap.*,
   *   COUNT(d.id) as nb_dossiers_traites,
   *   COUNT(CASE WHEN d.status = 'valide' THEN 1 END) as nb_dossiers_valides,
   *   COUNT(CASE WHEN d.status IN ('nouveau', 'devis_envoye', 'analyse') THEN 1 END) as nb_dossiers_en_cours,
   *   COALESCE(SUM(CASE WHEN d.status = 'valide' THEN d.economie_client END), 0) as economies_generees,
   *   COALESCE(SUM(CASE WHEN d.status = 'finalise' THEN d.ca_gmb END), 0) as ca_total_gmb,
   *   CASE 
   *     WHEN COUNT(d.id) > 0 THEN 
   *       ROUND((COUNT(CASE WHEN d.status = 'valide' THEN 1 END)::float / COUNT(d.id) * 100), 2)
   *     ELSE 0 
   *   END as taux_conversion
   * FROM apporteur_profiles ap
   * LEFT JOIN dossiers d ON d.apporteur_id = ap.user_id
   * WHERE ap.user_id = $1
   * GROUP BY ap.id
   * ```
   */
  const fetchApporteurComplet = async () => {
    try {
      setIsLoading(true);
      
      // 1. Récupérer les données de base de l'apporteur
      const apporteurData = await ApporteursService.getApporteurById(apporteurId);
      
      // 2. Récupérer les statistiques calculées (méthode centralisée)
      const stats = await ApporteursService.getApporteurStats(apporteurId);
      
      // 3. Récupérer la performance mensuelle (24 mois)
      const monthlyPerformance = await ApporteursService.getMonthlyPerformance(apporteurId, 24);
      
      // Mapper les données pour correspondre à l'interface ApporteurProfile
      const mappedApporteur: ApporteurProfile = {
        id: apporteurData.id,
        user_id: apporteurData.user_id || apporteurData.id,
        nom: apporteurData.nom,
        prenom: apporteurData.prenom,
        email: apporteurData.email,
        telephone: apporteurData.telephone || 'Non renseigné',
        date_inscription: apporteurData.created_at,
        statut: apporteurData.statut,
        nb_dossiers_traites: stats.totalDossiers,
        nb_dossiers_en_cours: stats.totalDossiers - stats.dossiersValides,
        nb_dossiers_valides: stats.dossiersValides,
        economies_generees: stats.economiesGenerees,
        taux_conversion: stats.tauxConversion,
        created_at: apporteurData.created_at,
        updated_at: apporteurData.updated_at,
        last_login: apporteurData.last_login_at || apporteurData.updated_at
      };

      // Extraire les dossiers récents depuis apporteurData.dossiers
      const dossiers = apporteurData.dossiers || [];
      const dossiersRecents = dossiers
        .sort((a: any, b: any) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime())
        .slice(0, 5) // Garder les 5 plus récents
        .map((d: any) => ({
          id: d.id,
          nom: d.client_infos?.[0]?.client_nom || 'N/A',
          prenom: d.client_infos?.[0]?.client_prenom || 'N/A',
          date_soumission: d.date_creation,
          statut: d.statut || 'en_attente',
          economie: Number(d.economie_generee || 0),
          montant_capital: Number(d.pret_data?.[0]?.montant_capital || 0),
          is_couple: d.is_couple || false
        }));

      // Mapper les statistiques
      const mappedStatistics: ApporteurStatistics = {
        performance_mensuelle: monthlyPerformance.map((m: any) => ({
          mois: m.month,
          dossiers_traites: m.dossiers_traites,
          dossiers_valides: m.dossiers_valides,
          economies_generees: m.economies_generees,
          ca_gmb: 0 // TODO: À calculer une fois système commission implémenté
        })),
        repartition_types: [], // TODO: À implémenter si nécessaire
        clients_recents: dossiersRecents
      };

      setApporteur(mappedApporteur);
      setStatistics(mappedStatistics);

      // Charger la commission personnalisée
      await fetchCommissionSettings();
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données apporteur:', error);
      alert(`Erreur: ${error.message || 'Impossible de charger les données de l\'apporteur'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les paramètres de commission de l'apporteur
  const fetchCommissionSettings = async () => {
    try {
      // Récupérer le broker_id depuis broker_apporteurs
      const { data: baData, error: baError } = await supabase
        .from('broker_apporteurs')
        .select('broker_id, custom_share_pct, custom_fixed_amount')
        .eq('apporteur_profile_id', apporteurId)
        .single();

      if (baError) {
        console.error('Erreur récupération broker_apporteurs:', baError);
        return;
      }

      // Récupérer les paramètres par défaut du broker
      const { data: settingsData, error: settingsError } = await supabase
        .from('broker_commission_settings')
        .select('default_apporteur_share_pct, default_apporteur_fixed_amount')
        .eq('broker_id', baData.broker_id)
        .single();

      if (!settingsError && settingsData) {
        if (settingsData.default_apporteur_fixed_amount !== null) {
          setDefaultCommissionType('fixed');
          setDefaultFixedAmount(settingsData.default_apporteur_fixed_amount / 100);
          setDefaultSharePct(settingsData.default_apporteur_share_pct || 80);
        } else {
          setDefaultCommissionType('percentage');
          setDefaultSharePct(settingsData.default_apporteur_share_pct || 80);
        }
      }

      // Définir la commission personnalisée si elle existe
      if (baData.custom_fixed_amount !== null) {
        setCommissionType('fixed');
        setCustomFixedAmount(baData.custom_fixed_amount / 100);
        setUseCustomShare(true);
      } else if (baData.custom_share_pct !== null) {
        setCommissionType('percentage');
        setCustomSharePct(baData.custom_share_pct);
        setUseCustomShare(true);
      } else {
        setCustomSharePct(null);
        setCustomFixedAmount(null);
        setUseCustomShare(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de commission:', error);
    }
  };

  // Fonction pour sauvegarder la commission personnalisée
  const handleSaveCommission = async () => {
    setIsSavingCommission(true);
    setCommissionSaveSuccess(false);

    try {
      // Préparer les valeurs à sauvegarder
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (!useCustomShare) {
        // Pas de commission personnalisée - utiliser les défauts
        updateData.custom_share_pct = null;
        updateData.custom_fixed_amount = null;
      } else if (commissionType === 'percentage') {
        updateData.custom_share_pct = customSharePct;
        updateData.custom_fixed_amount = null;
      } else {
        updateData.custom_share_pct = null;
        updateData.custom_fixed_amount = customFixedAmount !== null ? Math.round(customFixedAmount * 100) : null;
      }

      const { error } = await supabase
        .from('broker_apporteurs')
        .update(updateData)
        .eq('apporteur_profile_id', apporteurId);

      if (error) throw error;

      setCommissionSaveSuccess(true);
      setTimeout(() => setCommissionSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde de la commission:', error);
      alert(`Erreur: ${error.message || 'Impossible de sauvegarder la commission'}`);
    } finally {
      setIsSavingCommission(false);
    }
  };

  // Fonction pour récupérer les dossiers d'un mois spécifique
  const fetchMonthlyDossiers = async (monthStr: string) => {
    setLoadingMonthlyData(true);
    try {
      // Si pas d'apporteur chargé, return
      if (!apporteur) {
        setMonthlyDossiers([]);
        return;
      }

      // Récupérer les dossiers du mois depuis les données déjà fetch dans apporteurData
      const apporteurData = await ApporteursService.getApporteurById(apporteurId);
      const allDossiers = apporteurData.dossiers || [];
      
      const filtered = allDossiers.filter((d: any) => {
        const dossierDate = new Date(d.date_creation);
        const dossierMonth = dossierDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        return dossierMonth === monthStr;
      });

      // Mapper vers DossierMensuel
      const mapped: DossierMensuel[] = filtered.map((d: any) => ({
        id: d.id,
        numero: d.numero_dossier || 'N/A',
        client_nom: d.client_infos?.[0]?.client_nom || 'N/A',
        client_prenom: d.client_infos?.[0]?.client_prenom || 'N/A',
        date_soumission: d.date_creation,
        statut: d.statut || 'nouveau' as any,
        montant_capital: Number(d.pret_data?.[0]?.montant_capital || 0),
        economie_generee: Number(d.economie_generee || 0),
        ca_gmb: 0, // TODO: À calculer une fois système commission implémenté
        type_assurance: d.pret_data?.[0]?.type_pret || d.type_dossier || 'N/A',
        is_couple: d.is_couple || false
      }));

      setMonthlyDossiers(mapped);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers mensuels:', error);
      setMonthlyDossiers([]);
    } finally {
      setLoadingMonthlyData(false);
    }
  };

  // Fonction pour ouvrir la modale d'un mois
  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
    setShowMonthModal(true);
    fetchMonthlyDossiers(month);
  };

  // Fonction pour naviguer vers un dossier
  const handleDossierClick = (dossierId: string) => {
    router.push(`/admin/dossiers/${dossierId}`);
    setShowMonthModal(false);
  };

  // Fonction pour naviguer vers un dossier récent
  const handleClientRecentClick = (clientId: string) => {
    router.push(`/admin/dossiers/${clientId}`);
  };

  // Filtre les données de performance selon la période sélectionnée
  const getFilteredPerformanceData = () => {
    if (!statistics?.performance_mensuelle) return [];
    
    const dataCount = {
      '6mois': 6,
      '12mois': 12,
      '24mois': 24,
      'tout': statistics.performance_mensuelle.length
    };
    
    return statistics.performance_mensuelle.slice(0, dataCount[performancePeriod]);
  };

  useEffect(() => {
    if (apporteurId) {
      fetchApporteurComplet();
    }
  }, [apporteurId]);

  // Empêcher le scroll du background quand la modale est ouverte
  useEffect(() => {
    if (showMonthModal || showContactModal || showSuspendModal || showReactivateModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup au démontage du composant
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMonthModal, showContactModal, showSuspendModal, showReactivateModal, showDeleteModal]);

  // ============================================================================
  // SUPABASE INTEGRATION - ACTIONS ADMINISTRATEUR
  // ============================================================================


  /**
   * FONCTION DE SUSPENSION D'UN APPORTEUR
   * 
   * Met à jour le statut de l'apporteur et l'empêche de soumettre de nouveaux dossiers
   */
  const handleSuspendApporteur = async () => {
    if (!suspendReason.trim()) {
      alert('La raison de la suspension est obligatoire.');
      return;
    }
    
    try {
      await ApporteursService.suspendApporteur(apporteurId, suspendReason.trim());
      
      // Rafraîchir les données
      await fetchApporteurComplet();
      
      setShowSuspendModal(false);
      setSuspendReason('');
      alert('Apporteur suspendu avec succès.');
    } catch (error: any) {
      console.error('Erreur lors de la suspension:', error);
      alert(`Erreur: ${error.message || 'Impossible de suspendre l\'apporteur'}`);
    }
  };

  const handleReactivateApporteur = async () => {
    try {
      await ApporteursService.reactivateApporteur(apporteurId);
      
      // Rafraîchir les données
      await fetchApporteurComplet();
      
      setShowReactivateModal(false);
      alert('Apporteur réactivé avec succès.');
    } catch (error: any) {
      console.error('Erreur lors de la réactivation:', error);
      alert(`Erreur: ${error.message || 'Impossible de réactiver l\'apporteur'}`);
    }
  };

  const handleDeleteApporteur = async () => {
    try {
      await ApporteursService.deleteApporteur(apporteurId);
      
      setShowDeleteModal(false);
      alert('Apporteur supprimé avec succès. Redirection...');
      
      // Rediriger vers la liste des apporteurs
      router.push('/admin/apporteurs');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      alert(`Erreur: ${error.message || 'Impossible de supprimer l\'apporteur'}`);
    }
  };

  const handleContactApporteur = async () => {
    if (!contactMessage.trim()) {
      alert('Le message ne peut pas être vide.');
      return;
    }
    
    try {
      console.log('⚠️ Fonctionnalité non implémentée: Envoi d\'email via Resend');
      console.log('À:', apporteur?.email);
      console.log('Objet:', contactSubject || 'Message de l\'administration GMB Courtage');
      console.log('Message:', contactMessage);
      
      // TODO: Implémenter l'envoi via Resend une fois intégré
      /*
      await supabase.functions.invoke('send-admin-message', {
        body: {
          to_email: apporteur.email,
          to_name: `${apporteur.prenom} ${apporteur.nom}`,
          subject: contactSubject || 'Message de l\'administration GMB Courtage',
          message: contactMessage
        }
      });
      */
      
      setShowContactModal(false);
      setContactMessage('');
      setContactSubject('');
      alert('Pour l\'instant, cette fonctionnalité affiche juste une alerte. L\'intégration avec Resend sera faite plus tard.');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message'}`);
    }
  };



  // ✅ Utilisation des badges centralisés depuis lib/utils/apporteur-badges.ts
  const getStatutBadge = (statut: string) => {
    const config = getApporteurBadgeConfig(statut);
    
    if (!config) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          Inconnu
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

  /**
   * 🎯 Badge de statut - Utilise la source de vérité unique
   * @param statutCanonique - Statut canonique depuis la DB (via statut_canon)
   */
  const getDossierStatutBadge = (statutCanonique: string) => {
    // ✅ Utilise l'utilitaire centralisé pour garantir la cohérence
    const config = getStatutBadgeConfig(statutCanonique);
    
    if (!config) {
      // Fallback si statut inconnu
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <i className="ri-question-line mr-1"></i>
          Inconnu
        </span>
      );
    }
    
    const { color, text, icon } = config;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <i className={`${icon} mr-1`}></i>
        {text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!apporteur) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Apporteur introuvable
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Cet apporteur n'existe pas ou a été supprimé.
          </p>
          <button
            onClick={() => router.push('/admin/apporteurs')}
            className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center space-x-2"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Retour aux apporteurs</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">
                  {apporteur.prenom} {apporteur.nom}
                </h1>
                {getStatutBadge(apporteur.statut)}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <i className="ri-mail-line mr-1"></i>
                  {apporteur.email}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'action responsive - Déplacés sous la description */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 sm:flex-none bg-[#335FAD]/80 hover:bg-[#335FAD]/90 dark:bg-[#335FAD]/70 dark:hover:bg-[#335FAD]/80 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              <i className="ri-mail-send-line mr-2"></i>
              Contacter
            </button>
            {apporteur.statut === 'actif' && (
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                <i className="ri-pause-line mr-2"></i>
                Suspendre
              </button>
            )}
            {apporteur.statut === 'suspendu' && (
              <button
                onClick={() => setShowReactivateModal(true)}
                className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 dark:bg-green-400 dark:hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                <i className="ri-play-line mr-2"></i>
                Réactiver
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 dark:bg-red-400 dark:hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              <i className="ri-delete-bin-line mr-2"></i>
              Supprimer
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'statistics'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Statistiques
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Statistiques principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* KPIs principaux */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Dossiers traités</p>
                      <p className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white">{apporteur.nb_dossiers_traites || 0}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD] text-lg sm:text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Taux de conversion</p>
                      <p className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white">{apporteur.taux_conversion || 0}%</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-percent-line text-green-600 dark:text-green-400 text-lg sm:text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Économies générées</p>
                      <p className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white truncate">{formatCurrency(apporteur.economies_generees || 0, { decimals: 0 })}</p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-money-euro-circle-line text-purple-600 dark:text-purple-400 text-lg sm:text-xl"></i>
                    </div>
                  </div>
                </div>

              </div>

              {/* CA Total GMB Courtage */}
              {/* TODO: Calculer le CA réel une fois que le système de rémunération/commission est implémenté */}
              {/* Pour l'instant, on affiche N/A car le calcul nécessite les données de commission par dossier */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Chiffre d'affaires généré pour GMB Courtage
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <i className="ri-money-dollar-circle-line text-[#335FAD] dark:text-[#335FAD]/80 text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-3xl font-light text-gray-500 dark:text-gray-400">N/A</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Calcul en cours d'implémentation</p>
                  </div>
                </div>
              </div>

              {/* Dossiers récents */}
              {statistics && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Dossiers récents
                  </h3>
                  {statistics.clients_recents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-folder-open-line text-gray-400 dark:text-gray-500 text-xl"></i>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun dossier pour le moment</p>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {statistics.clients_recents.map((client) => (
                      <div 
                        key={client.id} 
                        onClick={() => handleClientRecentClick(client.id)}
                        className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[#335FAD] dark:text-[#335FAD]/80 font-medium text-sm">
                              {client.prenom.charAt(0)}{client.nom.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {client.prenom} {client.nom}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(client.date_soumission)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <div className="hidden sm:flex flex-col items-end space-y-2 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Capital</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                  {formatCurrency(client.montant_capital, { decimals: 0 })}
                                </p>
                              </div>
                              {client.economie > 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Économie</p>
                                  <p className="text-sm font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                                {formatCurrency(client.economie)}
                                  </p>
                            </div>
                              )}
                          </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            client.is_couple 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {client.is_couple ? 'Couple' : 'Seul'}
                          </span>
                          <i className="ri-arrow-right-line text-gray-400 dark:text-gray-500 flex-shrink-0"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Informations de contact */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informations de contact
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom complet
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {apporteur.prenom} {apporteur.nom}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{apporteur.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Téléphone
                    </label>
                    <p className="text-gray-900 dark:text-white">{apporteur.telephone}</p>
                  </div>
                </div>
              </div>

              {/* Informations du compte */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informations du compte
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date d'inscription
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(apporteur.date_inscription)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Dernière connexion
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(apporteur.last_login)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Statut du compte
                    </label>
                    {getStatutBadge(apporteur.statut)}
                  </div>
                </div>
              </div>

              {/* Commission personnalisée */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <i className="ri-percent-line text-[#335FAD]"></i>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Commission
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Info sur la commission par défaut */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Commission par défaut du cabinet</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {defaultCommissionType === 'fixed' 
                        ? `${defaultFixedAmount?.toFixed(2) || '0'}€ fixe par dossier`
                        : `${defaultSharePct}% des frais de courtage`
                      }
                    </p>
                  </div>

                  {/* Toggle pour commission personnalisée */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Commission personnalisée
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Définir une commission spécifique pour cet apporteur
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUseCustomShare(!useCustomShare);
                        if (!useCustomShare) {
                          // Initialiser avec les défauts du broker
                          if (defaultCommissionType === 'fixed') {
                            setCommissionType('fixed');
                            setCustomFixedAmount(defaultFixedAmount || 100);
                          } else {
                            setCommissionType('percentage');
                            setCustomSharePct(defaultSharePct);
                          }
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useCustomShare ? 'bg-[#335FAD]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useCustomShare ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Options de commission personnalisée */}
                  {useCustomShare && (
                    <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {/* Type de commission */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCommissionType('percentage');
                            if (customSharePct === null) setCustomSharePct(defaultSharePct);
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            commissionType === 'percentage'
                              ? 'border-[#335FAD] bg-[#335FAD]/10 text-[#335FAD]'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          <i className="ri-percent-line mr-1"></i>
                          Pourcentage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCommissionType('fixed');
                            if (customFixedAmount === null) setCustomFixedAmount(defaultFixedAmount || 100);
                          }}
                          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            commissionType === 'fixed'
                              ? 'border-[#335FAD] bg-[#335FAD]/10 text-[#335FAD]'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          <i className="ri-money-euro-circle-line mr-1"></i>
                          Montant fixe
                        </button>
                      </div>

                      {/* Input pourcentage */}
                      {commissionType === 'percentage' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={customSharePct ?? defaultSharePct}
                              onChange={(e) => setCustomSharePct(Number(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#335FAD]"
                            />
                            <div className="w-20">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={customSharePct ?? defaultSharePct}
                                  onChange={(e) => setCustomSharePct(Math.min(100, Math.max(0, Number(e.target.value))))}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right pr-6"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">%</span>
                              </div>
                            </div>
                          </div>

                          {/* Comparaison avec défaut */}
                          {defaultCommissionType === 'percentage' && customSharePct !== null && customSharePct !== defaultSharePct && (
                            <div className={`text-xs px-3 py-2 rounded-lg ${
                              customSharePct > defaultSharePct
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                            }`}>
                              <i className={`${customSharePct > defaultSharePct ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} mr-1`}></i>
                              {customSharePct > defaultSharePct ? '+' : ''}{customSharePct - defaultSharePct}% par rapport au taux par défaut
                            </div>
                          )}
                        </div>
                      )}

                      {/* Input montant fixe */}
                      {commissionType === 'fixed' && (
                        <div className="space-y-2">
                          <div className="relative w-32">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={customFixedAmount ?? (defaultFixedAmount || 100)}
                              onChange={(e) => setCustomFixedAmount(Number(e.target.value))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">€</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Cet apporteur touchera ce montant fixe par dossier finalisé
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message succès */}
                  {commissionSaveSuccess && (
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center">
                        <i className="ri-check-line mr-1"></i>
                        Commission enregistrée
                      </p>
                    </div>
                  )}

                  {/* Bouton sauvegarder */}
                  <button
                    onClick={handleSaveCommission}
                    disabled={isSavingCommission}
                    className="w-full py-2 px-3 text-sm font-medium text-white bg-[#335FAD] hover:bg-[#2a4d8f] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSavingCommission ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line"></i>
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && statistics && (
          <div className="space-y-8">
            {/* Performance mensuelle améliorée */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Performance mensuelle détaillée
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Cliquez sur un mois pour voir les dossiers traités
                  </p>
                </div>
                
                {/* Filtres de période */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['6mois', '12mois', '24mois', 'tout'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setPerformancePeriod(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        performancePeriod === period
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {period === '6mois' ? '6 mois' : 
                       period === '12mois' ? '12 mois' : 
                       period === '24mois' ? '24 mois' : 'Tout'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Version desktop */}
              <div className="hidden lg:block overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-y border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <i className="ri-calendar-line"></i>
                          <span>Mois</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <i className="ri-file-list-line"></i>
                          <span>Traités</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <i className="ri-checkbox-circle-line"></i>
                          <span>Validés</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <i className="ri-money-euro-circle-line"></i>
                          <span>Économies</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <i className="ri-line-chart-line"></i>
                          <span>CA GMB</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {getFilteredPerformanceData().map((month, index) => {
                      const taux = month.dossiers_traites > 0 ? (month.dossiers_valides / month.dossiers_traites * 100) : 0;
                      
                      return (
                        <tr 
                          key={index}
                          onClick={() => handleMonthClick(month.mois)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-all"
                        >
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {month.mois}
                              </span>
                              <i className="ri-eye-line text-gray-400 dark:text-gray-500 text-xs"></i>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                              <span className="font-semibold text-gray-900 dark:text-white">
                              {month.dossiers_traites}
                            </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                {month.dossiers_valides}
                              </span>
                              </div>
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                                taux >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                                taux >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 
                                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {taux.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                            {formatCurrency(month.economies_generees)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatCurrency(month.ca_gmb)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Version mobile/tablette - cartes empilées */}
              <div className="lg:hidden">
                <div className="space-y-4">
                  {getFilteredPerformanceData().map((month, index) => {
                    const taux = month.dossiers_traites > 0 ? (month.dossiers_valides / month.dossiers_traites * 100) : 0;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => handleMonthClick(month.mois)}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <i className="ri-calendar-line text-gray-400 dark:text-gray-500"></i>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {month.mois}
                            </span>
                          </div>
                          <i className="ri-eye-line text-gray-400 dark:text-gray-500 text-sm"></i>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Dossiers traités</span>
                            <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md mt-1">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {month.dossiers_traites}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Dossiers validés</span>
                            <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md mt-1">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {month.dossiers_valides}
                              </span>
                            </div>
                            <div className="mt-1">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-md inline-block ${
                                taux >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                                taux >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 
                                'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {taux.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">Économies générées</span>
                            <div className="font-semibold text-green-600 dark:text-green-400 mt-1">
                              {formatCurrency(month.economies_generees)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">CA GMB</span>
                            <div className="font-medium text-gray-900 dark:text-white mt-1">
                              {formatCurrency(month.ca_gmb)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Modals */}
      
      {/* Modal des dossiers mensuels */}
      {showMonthModal && selectedMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header de la modale */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Dossiers de {selectedMonth}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {apporteur.prenom} {apporteur.nom} • Cliquez sur un dossier pour l'ouvrir
                  </p>
                </div>
                <button
                  onClick={() => setShowMonthModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
            </div>

            {/* Contenu de la modale */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingMonthlyData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Chargement des dossiers...</p>
                </div>
              ) : monthlyDossiers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-file-list-3-line text-gray-400 dark:text-gray-500 text-2xl"></i>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucun dossier ce mois-ci
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucun dossier n'a été traité en {selectedMonth}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyDossiers.map((dossier) => (
                    <div 
                      key={dossier.id}
                      onClick={() => handleDossierClick(dossier.id)}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                              {dossier.client_prenom} {dossier.client_nom}
                            </h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              dossier.is_couple 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {dossier.is_couple ? 'Couple' : 'Seul'}
                            </span>
                            {getDossierStatutBadge(dossier.statut)}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Numéro :</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {dossier.numero}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Capital :</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatCurrency(dossier.montant_capital)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Date :</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {formatDate(dossier.date_soumission)}
                              </span>
                            </div>
                          </div>
                          
                          {dossier.economie_generee > 0 && (
                          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center space-x-2">
                              <i className="ri-money-euro-circle-line text-green-600 dark:text-green-400"></i>
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Économie générée</span>
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  {formatCurrency(dossier.economie_generee)}
                                </p>
                              </div>
                            </div>
                              </div>
                          )}
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <i className="ri-arrow-right-line text-gray-400 dark:text-gray-500"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de contact */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Contacter {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              {/* NOUVEAU: Champ Objet */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objet du message
                </label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Ex: Demande de précisions sur votre dossier..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {contactSubject.length}/100 caractères
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {contactMessage.length}/500 caractères
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactMessage('');
                    setContactSubject('');
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleContactApporteur}
                  disabled={!contactMessage.trim()}
                  className="flex-1 bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-send-plane-line mr-2"></i>
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suspension */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Suspendre {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Cette action suspendra temporairement le compte de l'apporteur. Il ne pourra plus soumettre de nouveaux dossiers.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Raison de la suspension
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Indiquez la raison de la suspension..."
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  maxLength={300}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleSuspendApporteur}
                  disabled={!suspendReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-pause-line mr-2"></i>
                  Suspendre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réactivation */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Réactiver {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-check-circle-line text-green-600 dark:text-green-400 text-xl mt-0.5"></i>
                  <div>
                    <p className="text-green-900 dark:text-green-200 font-medium mb-1">Réactivation du compte</p>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Cette action réactivera le compte de l'apporteur. Il pourra à nouveau soumettre de nouveaux dossiers et accéder à toutes les fonctionnalités.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir réactiver ce compte ?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleReactivateApporteur}
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <i className="ri-play-line mr-2"></i>
                  Réactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Supprimer {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-xl mt-0.5"></i>
                  <div>
                    <p className="text-red-900 dark:text-red-200 font-medium mb-1">Action irréversible</p>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      Cette action supprimera définitivement le compte apporteur, ses données personnelles et l'accès à tous ses dossiers. Les dossiers existés seront archivés.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement ce compte ?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleDeleteApporteur}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <i className="ri-delete-bin-line mr-2"></i>
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
