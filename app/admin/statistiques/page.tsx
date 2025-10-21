'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import { DatePicker } from '@/components/ui/date-picker';

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

// Interface pour les KPIs globaux
interface GlobalKPIs {
  nb_dossiers_traites: number;
  chiffre_affaires_total: number; // Somme des "Frais de Gestion Nets" - À intégrer plus tard
  economie_moyenne_generee: number;
  capital_total_assure: number;
}

// Interface pour l'analyse de l'activité
interface ActivityAnalysis {
  taux_conversion_global: number;
  delai_traitement_moyen: number; // en jours
  nb_dossiers_soumis: number;
  nb_dossiers_finalises: number;
}

// Interface pour les motifs de refus
interface RefusalReason {
  motif: string;
  nombre: number;
  pourcentage: number;
}

// Interface pour l'analyse par compagnie
interface CompanyAnalysis {
  nom_compagnie: string;
  ca_pourcentage: number;
  ca_montant: number;
  nb_devis_envoyes: number;
  nb_devis_acceptes: number;
  taux_acceptation: number;
}

// Interface pour l'évolution temporelle
interface TemporalEvolution {
  periode: string;
  nb_dossiers: number;
  ca_total: number;
  economies_generees: number;
}

// Types pour les filtres de période
type PeriodFilter = 'semaine' | 'mois' | 'trimestre' | 'annee' | 'personnalise';

interface CustomDateRange {
  debut: string;
  fin: string;
}

export default function AdminStatistiquesPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // États pour les filtres de période
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mois');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    debut: '',
    fin: ''
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // États pour les données statistiques
  const [globalKPIs, setGlobalKPIs] = useState<GlobalKPIs | null>(null);
  const [activityAnalysis, setActivityAnalysis] = useState<ActivityAnalysis | null>(null);
  const [refusalReasons, setRefusalReasons] = useState<RefusalReason[]>([]);
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis[]>([]);
  const [temporalEvolution, setTemporalEvolution] = useState<TemporalEvolution[]>([]);

  // Données admin simulées
  const adminData = useMemo<AdminData>(() => ({
    id: 'admin1',
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
  }), []);

  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DES STATISTIQUES
  // ============================================================================

  /**
   * FONCTION DE RÉCUPÉRATION DES KPIs GLOBAUX
   * 
   * Cette fonction doit récupérer depuis Supabase :
   * 1. Nombre de dossiers traités (finalisés) sur la période
   * 2. Chiffre d'affaires total (somme des frais de gestion nets) - À implémenter plus tard
   * 3. Économie moyenne générée par dossier
   * 4. Capital total assuré
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   COUNT(CASE WHEN statut = 'finalise' THEN 1 END) as nb_dossiers_traites,
   *   COALESCE(SUM(frais_gestion_nets), 0) as chiffre_affaires_total,
   *   COALESCE(AVG(CASE WHEN statut = 'finalise' THEN economie_generee END), 0) as economie_moyenne_generee,
   *   COALESCE(SUM(CASE WHEN statut = 'finalise' THEN montant_capital END), 0) as capital_total_assure
   * FROM dossiers 
   * WHERE created_at >= $1 AND created_at <= $2
   *   AND is_draft = false
   * ```
   */
  const fetchGlobalKPIs = async (startDate: string, endDate: string) => {
    try {
      // SUPABASE: Récupération des KPIs globaux
      /*
      const { data, error } = await supabase
        .rpc('get_global_kpis', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
      */

      // Données mock pour la démonstration
      return {
        nb_dossiers_traites: 234,
        chiffre_affaires_total: 0, // À implémenter plus tard
        economie_moyenne_generee: 2850,
        capital_total_assure: 45600000
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des KPIs globaux:', error);
      return null;
    }
  };

  /**
   * FONCTION DE RÉCUPÉRATION DE L'ANALYSE D'ACTIVITÉ
   * 
   * Cette fonction calcule :
   * 1. Taux de conversion global
   * 2. Délai de traitement moyen
   * 3. Nombre de dossiers soumis vs finalisés
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   COUNT(*) as nb_dossiers_soumis,
   *   COUNT(CASE WHEN statut = 'finalise' THEN 1 END) as nb_dossiers_finalises,
   *   ROUND(
   *     (COUNT(CASE WHEN statut = 'finalise' THEN 1 END)::float / COUNT(*)::float) * 100, 2
   *   ) as taux_conversion_global,
   *   ROUND(
   *     AVG(CASE 
   *       WHEN statut = 'finalise' THEN 
   *         EXTRACT(days FROM (date_finalisation - created_at))
   *       END
   *     ), 1
   *   ) as delai_traitement_moyen
   * FROM dossiers 
   * WHERE created_at >= $1 AND created_at <= $2
   *   AND is_draft = false
   * ```
   */
  const fetchActivityAnalysis = async (startDate: string, endDate: string) => {
    try {
      // SUPABASE: Récupération de l'analyse d'activité
      /*
      const { data, error } = await supabase
        .rpc('get_activity_analysis', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
      */

      // Données mock pour la démonstration
      return {
        taux_conversion_global: 78.5,
        delai_traitement_moyen: 12.3,
        nb_dossiers_soumis: 298,
        nb_dossiers_finalises: 234
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'analyse d\'activité:', error);
      return null;
    }
  };

  /**
   * FONCTION DE RÉCUPÉRATION DES MOTIFS DE REFUS
   * 
   * Cette fonction analyse les motifs de refus saisis par les apporteurs
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   motif_refus,
   *   COUNT(*) as nombre,
   *   ROUND((COUNT(*)::float / SUM(COUNT(*)) OVER ()) * 100, 1) as pourcentage
   * FROM dossiers 
   * WHERE created_at >= $1 AND created_at <= $2
   *   AND statut = 'refuse'
   *   AND motif_refus IS NOT NULL
   *   AND is_draft = false
   * GROUP BY motif_refus
   * ORDER BY nombre DESC
   * ```
   */
  const fetchRefusalReasons = async (startDate: string, endDate: string) => {
    try {
      // SUPABASE: Récupération des motifs de refus
      /*
      const { data, error } = await supabase
        .rpc('get_refusal_reasons', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
      */

      // Données mock pour la démonstration
      return [
        { motif: 'Prix trop élevé', nombre: 28, pourcentage: 40.0 },
        { motif: 'Client a gardé l\'assurance banque', nombre: 21, pourcentage: 30.0 },
        { motif: 'Questionnaire médical trop contraignant', nombre: 11, pourcentage: 15.7 },
        { motif: 'Délai de traitement trop long', nombre: 7, pourcentage: 10.0 },
        { motif: 'Autres motifs', nombre: 3, pourcentage: 4.3 }
      ];
    } catch (error) {
      console.error('Erreur lors de la récupération des motifs de refus:', error);
      return [];
    }
  };

  /**
   * FONCTION DE RÉCUPÉRATION DE L'ANALYSE PAR COMPAGNIE
   * 
   * Cette fonction analyse la performance de chaque compagnie d'assurance
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   c.nom as nom_compagnie,
   *   COALESCE(SUM(d.frais_gestion_nets), 0) as ca_montant,
   *   ROUND(
   *     (COALESCE(SUM(d.frais_gestion_nets), 0)::float / 
   *      NULLIF(SUM(SUM(d.frais_gestion_nets)) OVER (), 0)::float) * 100, 1
   *   ) as ca_pourcentage,
   *   COUNT(CASE WHEN d.statut IN ('devis_envoye', 'valide', 'finalise') THEN 1 END) as nb_devis_envoyes,
   *   COUNT(CASE WHEN d.statut IN ('valide', 'finalise') THEN 1 END) as nb_devis_acceptes,
   *   ROUND(
   *     (COUNT(CASE WHEN d.statut IN ('valide', 'finalise') THEN 1 END)::float /
   *      NULLIF(COUNT(CASE WHEN d.statut IN ('devis_envoye', 'valide', 'finalise') THEN 1 END), 0)::float) * 100, 1
   *   ) as taux_acceptation
   * FROM compagnies_assurance c
   * LEFT JOIN devis dv ON c.id = dv.compagnie_id
   * LEFT JOIN dossiers d ON dv.dossier_id = d.id
   * WHERE d.created_at >= $1 AND d.created_at <= $2
   *   AND d.is_draft = false
   * GROUP BY c.id, c.nom
   * HAVING COUNT(d.id) > 0
   * ORDER BY ca_montant DESC
   * ```
   */
  const fetchCompanyAnalysis = async (startDate: string, endDate: string) => {
    try {
      // SUPABASE: Récupération de l'analyse par compagnie
      /*
      const { data, error } = await supabase
        .rpc('get_company_analysis', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
      */

      // Données mock pour la démonstration
      return [
        {
          nom_compagnie: 'Generali',
          ca_pourcentage: 45.2,
          ca_montant: 125600,
          nb_devis_envoyes: 156,
          nb_devis_acceptes: 128,
          taux_acceptation: 82.1
        },
        {
          nom_compagnie: 'SwissLife',
          ca_pourcentage: 32.8,
          ca_montant: 91200,
          nb_devis_envoyes: 134,
          nb_devis_acceptes: 98,
          taux_acceptation: 73.1
        },
        {
          nom_compagnie: 'MNCAP',
          ca_pourcentage: 22.0,
          ca_montant: 61100,
          nb_devis_envoyes: 89,
          nb_devis_acceptes: 67,
          taux_acceptation: 75.3
        }
      ];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'analyse par compagnie:', error);
      return [];
    }
  };

  /**
   * FONCTION DE RÉCUPÉRATION DE L'ÉVOLUTION TEMPORELLE
   * 
   * Cette fonction récupère l'évolution des indicateurs dans le temps
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   DATE_TRUNC('month', created_at) as periode,
   *   COUNT(CASE WHEN statut = 'finalise' THEN 1 END) as nb_dossiers,
   *   COALESCE(SUM(CASE WHEN statut = 'finalise' THEN frais_gestion_nets END), 0) as ca_total,
   *   COALESCE(SUM(CASE WHEN statut = 'finalise' THEN economie_generee END), 0) as economies_generees
   * FROM dossiers 
   * WHERE created_at >= $1 AND created_at <= $2
   *   AND is_draft = false
   * GROUP BY DATE_TRUNC('month', created_at)
   * ORDER BY periode ASC
   * ```
   */
  const fetchTemporalEvolution = async (startDate: string, endDate: string) => {
    try {
      // SUPABASE: Récupération de l'évolution temporelle
      /*
      const { data, error } = await supabase
        .rpc('get_temporal_evolution', {
          start_date: startDate,
          end_date: endDate
        });

      if (error) throw error;
      return data;
      */

      // Données mock pour la démonstration
      return [
        { periode: '2023-09', nb_dossiers: 18, ca_total: 45200, economies_generees: 52800 },
        { periode: '2023-10', nb_dossiers: 22, ca_total: 56800, economies_generees: 64200 },
        { periode: '2023-11', nb_dossiers: 28, ca_total: 68400, economies_generees: 78600 },
        { periode: '2023-12', nb_dossiers: 31, ca_total: 74200, economies_generees: 89400 },
        { periode: '2024-01', nb_dossiers: 24, ca_total: 61200, economies_generees: 71800 }
      ];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'évolution temporelle:', error);
      return [];
    }
  };

  // ============================================================================
  // FONCTIONS UTILITAIRES POUR LES DATES
  // ============================================================================

  /**
   * Calcule les dates de début et fin selon le filtre sélectionné
   */
  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodFilter) {
      case 'semaine':
        // Début de la semaine (lundi)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() + 1);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'mois':
        // Début du mois
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case 'trimestre':
        // Début du trimestre
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;

      case 'annee':
        // Début de l'année
        startDate = new Date(now.getFullYear(), 0, 1);
        break;

      case 'personnalise':
        if (customDateRange.debut && customDateRange.fin) {
          startDate = new Date(customDateRange.debut);
          endDate = new Date(customDateRange.fin);
        } else {
          // Par défaut, mois en cours
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;

      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  // ============================================================================
  // FONCTION PRINCIPALE DE CHARGEMENT DES DONNÉES
  // ============================================================================

  /**
   * Charge toutes les données statistiques en fonction du filtre de période
   */
  const loadStatistics = async () => {
    setIsLoading(true);
    
    try {
      const { startDate, endDate } = getDateRange();

      // Chargement parallèle de toutes les données
      const [
        kpis,
        activity,
        refusals,
        companies,
        evolution
      ] = await Promise.all([
        fetchGlobalKPIs(startDate, endDate),
        fetchActivityAnalysis(startDate, endDate),
        fetchRefusalReasons(startDate, endDate),
        fetchCompanyAnalysis(startDate, endDate),
        fetchTemporalEvolution(startDate, endDate)
      ]);

      setGlobalKPIs(kpis);
      setActivityAnalysis(activity);
      setRefusalReasons(refusals);
      setCompanyAnalysis(companies);
      setTemporalEvolution(evolution);

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Chargement initial et rechargement lors du changement de période
  useEffect(() => {
    if (isInitialized) {
      loadStatistics();
    }
  }, [isInitialized, periodFilter, customDateRange]);

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

  // Fonction pour appliquer la plage de dates personnalisée
  const handleCustomDateApply = () => {
    if (customDateRange.debut && customDateRange.fin) {
      setShowCustomDatePicker(false);
      // Le useEffect se chargera de recharger les données
    }
  };

  // Fonctions utilitaires de formatage
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Configuration des couleurs pour les graphiques
  const chartColors = [
    '#6366f1', // Indigo
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316'  // Orange
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <AdminHeader 
        darkMode={darkMode} 
        setDarkMode={handleDarkModeToggle}
        adminData={adminData}
      />
      
      {/* Hero section avec filtre de période global */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-2">
                Statistiques et Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Analyse complète des performances et indicateurs clés
              </p>
            </div>
            
            {/* Filtre de période global */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['semaine', 'mois', 'trimestre', 'annee'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      periodFilter === period
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {period === 'semaine' ? 'Semaine' : 
                     period === 'mois' ? 'Mois' : 
                     period === 'trimestre' ? 'Trimestre' : 'Année'}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setPeriodFilter('personnalise');
                  setShowCustomDatePicker(true);
                }}
                className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  periodFilter === 'personnalise'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-400'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <i className="ri-calendar-line mr-2"></i>
                Période personnalisée
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sélection de dates personnalisées */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Sélectionner une période
                </h3>
                <button
                  onClick={() => setShowCustomDatePicker(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début
                  </label>
                  <DatePicker
                    value={customDateRange.debut}
                    onChange={(value) => setCustomDateRange(prev => ({ ...prev, debut: value }))}
                    placeholder="Sélectionner une date de début"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de fin
                  </label>
                  <DatePicker
                    value={customDateRange.fin}
                    onChange={(value) => setCustomDateRange(prev => ({ ...prev, fin: value }))}
                    placeholder="Sélectionner une date de fin"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCustomDatePicker(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCustomDateApply}
                  disabled={!customDateRange.debut || !customDateRange.fin}
                  className="flex-1 bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Indicateurs de Performance Globale (KPIs) */}
            {globalKPIs && (
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                  Indicateurs de Performance Globale
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dossiers Traités</p>
                        <p className="text-2xl font-light text-gray-900 dark:text-white">{formatNumber(globalKPIs.nb_dossiers_traites)}</p>
                      </div>
                      <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center">
                        <i className="ri-file-check-line text-[#335FAD] dark:text-[#335FAD] text-xl"></i>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Chiffre d'Affaires</p>
                        <p className="text-2xl font-light text-gray-900 dark:text-white">
                          {globalKPIs.chiffre_affaires_total > 0 ? formatCurrency(globalKPIs.chiffre_affaires_total) : 'À venir'}
                        </p>
                        {globalKPIs.chiffre_affaires_total === 0 && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Fonctionnalité en développement
                          </p>
                        )}
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <i className="ri-money-euro-circle-line text-green-600 dark:text-green-400 text-xl"></i>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Économie Moyenne</p>
                        <p className="text-2xl font-light text-gray-900 dark:text-white">{formatCurrency(globalKPIs.economie_moyenne_generee)}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Par dossier traité
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <i className="ri-medal-line text-purple-600 dark:text-purple-400 text-xl"></i>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Capital Total Assuré</p>
                        <p className="text-xl font-light text-gray-900 dark:text-white">{formatCurrency(globalKPIs.capital_total_assure)}</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <i className="ri-safe-line text-orange-600 dark:text-orange-400 text-xl"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analyse de l'Activité */}
            {activityAnalysis && (
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                  Analyse de l'Activité (Efficacité Opérationnelle)
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Taux de Conversion Global
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl font-light text-gray-900 dark:text-white">
                            {formatPercentage(activityAnalysis.taux_conversion_global)}
                          </span>
                          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activityAnalysis.taux_conversion_global >= 75 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : activityAnalysis.taux_conversion_global >= 60
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {activityAnalysis.taux_conversion_global >= 75 ? 'Excellent' :
                             activityAnalysis.taux_conversion_global >= 60 ? 'Correct' : 'À améliorer'}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatNumber(activityAnalysis.nb_dossiers_finalises)} finalisés sur {formatNumber(activityAnalysis.nb_dossiers_soumis)} soumis
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Délai de Traitement Moyen
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl font-light text-gray-900 dark:text-white">
                            {activityAnalysis.delai_traitement_moyen.toFixed(1)} jours
                          </span>
                          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            activityAnalysis.delai_traitement_moyen <= 10 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : activityAnalysis.delai_traitement_moyen <= 15
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {activityAnalysis.delai_traitement_moyen <= 10 ? 'Rapide' :
                             activityAnalysis.delai_traitement_moyen <= 15 ? 'Correct' : 'Lent'}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          De la soumission à la finalisation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analyse des Motifs de Refus */}
            {refusalReasons.length > 0 && (
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                  Analyse des Motifs de Refus
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Graphique en barres */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Répartition des motifs
                      </h3>
                      <div className="space-y-4">
                        {refusalReasons.map((reason, index) => (
                          <div key={index} className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {reason.motif}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {reason.nombre} ({formatPercentage(reason.pourcentage)})
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${reason.pourcentage}%`,
                                    backgroundColor: chartColors[index % chartColors.length]
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Graphique en camembert (représentation visuelle) */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Vue d'ensemble
                      </h3>
                      <div className="relative w-48 h-48 mx-auto">
                        {/* Cercle représentant le camembert */}
                        <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
                        
                        {/* Légende */}
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {refusalReasons.reduce((acc, curr) => acc + curr.nombre, 0)} refus analysés
                          </p>
                        </div>
                      </div>
                      
                      {/* Légende détaillée */}
                      <div className="mt-8 space-y-2">
                        {refusalReasons.slice(0, 3).map((reason, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartColors[index] }}
                            ></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {reason.motif} ({formatPercentage(reason.pourcentage)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analyse des Produits (Compagnies d'Assurance) */}
            {companyAnalysis.length > 0 && (
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                  Analyse des Produits (Compagnies d'Assurance)
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Répartition du CA par Compagnie */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Répartition du CA par Compagnie
                    </h3>
                    <div className="space-y-4">
                      {companyAnalysis.map((company, index) => (
                        <div key={index} className="flex items-center">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {company.nom_compagnie}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(company.ca_montant)} ({formatPercentage(company.ca_pourcentage)})
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div
                                className="h-3 rounded-full transition-all duration-300"
                                style={{
                                  width: `${company.ca_pourcentage}%`,
                                  backgroundColor: chartColors[index % chartColors.length]
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Essentiel pour les négociations avec les compagnies
                      </p>
                    </div>
                  </div>

                  {/* Taux d'Acceptation par Compagnie */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Taux d'Acceptation par Compagnie
                    </h3>
                    <div className="space-y-4">
                      {companyAnalysis.map((company, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {company.nom_compagnie}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {company.nb_devis_acceptes}/{company.nb_devis_envoyes} devis
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-medium ${
                              company.taux_acceptation >= 80 
                                ? 'text-green-600 dark:text-green-400'
                                : company.taux_acceptation >= 70
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatPercentage(company.taux_acceptation)}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              company.taux_acceptation >= 80 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : company.taux_acceptation >= 70
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {company.taux_acceptation >= 80 ? 'Excellent' :
                               company.taux_acceptation >= 70 ? 'Bon' : 'À améliorer'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Mesure l'attractivité des offres de chaque assureur
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Évolution Temporelle */}
            {temporalEvolution.length > 0 && (
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
                  Évolution Temporelle
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Période
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Dossiers
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            CA Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Économies Générées
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {temporalEvolution.map((period, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(period.periode).toLocaleDateString('fr-FR', { 
                                year: 'numeric', 
                                month: 'long' 
                              })}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                              {formatNumber(period.nb_dossiers)}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(period.ca_total)}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(period.economies_generees)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}