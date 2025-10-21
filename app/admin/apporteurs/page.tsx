
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminHeader from '../../../components/AdminHeader';

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

// Interface pour un apporteur - Correspond à la table apporteur_profiles
interface Apporteur {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise?: string;
  siret?: string;
  adresse: string;
  date_inscription: string;
  statut: 'approuve' | 'suspendu';
  derniere_connexion?: string;
  // Statistiques calculées
  nb_dossiers_total: number;
  nb_dossiers_valides: number;
  chiffre_affaires: number;
  taux_conversion: number;
  // Métadonnées
  avatar_url?: string;
  specialites?: string[];
  zone_geographique?: string[];
}

// Interface pour le classement
interface ApporteurRanking {
  id: string;
  nom: string;
  prenom: string;
  initials: string;
  position: number;
  dossiersTraites: number; // Changé de dossiersValides vers dossiersTraites
  economiesGenerees: number; // Changé de chiffreAffaires vers economiesGenerees  
  evolutionPosition: number; // +1, -1, 0
  isNew: boolean;
}

export default function AdminApporteursPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('apporteurs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [sortField, setSortField] = useState<keyof Apporteur>('date_inscription');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [timeFilter, setTimeFilter] = useState<'semaine' | 'mois' | 'trimestre'>('mois');
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Données admin simulées
  const adminData = useMemo<AdminData>(() => ({
    id: 'admin1',
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
  }), []);

  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DES DONNÉES APPORTEURS
  // ============================================================================

  /**
   * ÉTAT PRINCIPAL DES APPORTEURS
   * 
   * Cet état doit être synchronisé avec la table 'apporteur_profiles' :
   * 1. Récupération avec statistiques calculées
   * 2. Filtrage par statut (approuvé, suspendu)
   * 3. Tri par différents critères (performance, date, etc.)
   * 
   * Query Supabase suggérée :
   * ```sql
   * SELECT 
   *   ap.*,
   *   COUNT(d.id) as nb_dossiers_total,
   *   COUNT(CASE WHEN d.statut = 'finalise' THEN 1 END) as nb_dossiers_valides,
   *   COALESCE(SUM(CASE WHEN d.statut = 'finalise' THEN d.commission_apporteur END), 0) as chiffre_affaires,
   *   CASE 
   *     WHEN COUNT(d.id) > 0 THEN 
   *       ROUND((COUNT(CASE WHEN d.statut = 'finalise' THEN 1 END)::float / COUNT(d.id)::float) * 100, 2)
   *     ELSE 0 
   *   END as taux_conversion
   * FROM apporteur_profiles ap
   * LEFT JOIN dossiers d ON ap.user_id = d.user_id
   * WHERE ap.statut IN ('approuve', 'suspendu')
   * GROUP BY ap.id, ap.user_id, ap.nom, ap.prenom, ap.email, ap.telephone, 
   *          ap.entreprise, ap.siret, ap.adresse, ap.date_inscription, ap.statut
   * ORDER BY ap.date_inscription DESC
   * ```
   */
  const [apporteurs, setApporteurs] = useState<Apporteur[]>([
    {
      id: '1',
      user_id: 'user1',
      nom: 'Dubois',
      prenom: 'Marie',
      email: 'marie.dubois@email.com',
      telephone: '06 12 34 56 78',
      entreprise: 'Assur Conseils SARL',
      siret: '12345678901234',
      adresse: '15 rue de la Paix, 75001 Paris',
      date_inscription: '2023-08-15T10:30:00Z',
      statut: 'approuve',
      derniere_connexion: '2024-01-20T09:15:00Z',
      nb_dossiers_total: 45,
      nb_dossiers_valides: 38,
      chiffre_affaires: 25600,
      taux_conversion: 84.4,
      specialites: ['Prêt immobilier', 'Rachat de crédit'],
      zone_geographique: ['Paris', 'Île-de-France']
    },
    {
      id: '2',
      user_id: 'user2',
      nom: 'Leclerc',
      prenom: 'Jean',
      email: 'jean.leclerc@email.com',
      telephone: '06 23 45 67 89',
      entreprise: 'Crédit Solutions',
      siret: '23456789012345',
      adresse: '28 avenue des Champs, 69001 Lyon',
      date_inscription: '2023-09-22T14:20:00Z',
      statut: 'approuve',
      derniere_connexion: '2024-01-19T16:45:00Z',
      nb_dossiers_total: 32,
      nb_dossiers_valides: 28,
      chiffre_affaires: 19800,
      taux_conversion: 87.5,
      specialites: ['Prêt immobilier'],
      zone_geographique: ['Lyon', 'Rhône-Alpes']
    },
    {
      id: '3',
      user_id: 'user3',
      nom: 'Martin',
      prenom: 'Paul',
      email: 'paul.martin@email.com',
      telephone: '06 34 56 78 90',
      adresse: '42 rue du Commerce, 13001 Marseille',
      date_inscription: '2023-11-10T11:30:00Z',
      statut: 'approuve',
      derniere_connexion: '2024-01-18T14:20:00Z',
      nb_dossiers_total: 28,
      nb_dossiers_valides: 22,
      chiffre_affaires: 15400,
      taux_conversion: 78.6,
      specialites: ['Prêt immobilier', 'Assurance vie'],
      zone_geographique: ['Marseille', 'PACA']
    },
    {
      id: '4',
      user_id: 'user4',
      nom: 'Bernard',
      prenom: 'Sophie',
      email: 'sophie.bernard@email.com',
      telephone: '06 45 67 89 01',
      entreprise: 'Finance Expert',
      siret: '34567890123456',
      adresse: '18 place de la République, 31000 Toulouse',
      date_inscription: '2023-12-05T08:45:00Z',
      statut: 'suspendu',
      derniere_connexion: '2024-01-10T10:30:00Z',
      nb_dossiers_total: 15,
      nb_dossiers_valides: 8,
      chiffre_affaires: 5200,
      taux_conversion: 53.3,
      specialites: ['Rachat de crédit'],
      zone_geographique: ['Toulouse', 'Midi-Pyrénées']
    }
  ]);

  /**
   * ÉTAT DU CLASSEMENT DES APPORTEURS
   * 
   * Récupère le classement complet avec évolution de position basé sur :
   * 1. Nombre de dossiers traités (tous statuts confondus sauf brouillon)
   * 2. Économies générées pour les clients (montant total des économies)
   * 
   * ```sql
   * SELECT 
   *   ap.id, ap.nom, ap.prenom,
   *   ROW_NUMBER() OVER (ORDER BY 
   *     (COUNT(d.id) * 0.4 + COALESCE(SUM(d.economies_client), 0) / 1000 * 0.6) DESC
   *   ) as position,
   *   COUNT(d.id) as dossiers_traites,
   *   COALESCE(SUM(d.economies_client), 0) as economies_generees,
   *   (position_actuelle - position_precedente) as evolution_position,
   *   CASE WHEN date_inscription > NOW() - INTERVAL '30 days' THEN true ELSE false END as is_new
   * FROM apporteurs_with_stats ap
   * LEFT JOIN dossiers d ON ap.user_id = d.user_id AND d.is_draft = false
   * WHERE ap.statut = 'approuve'
   * GROUP BY ap.id, ap.nom, ap.prenom
   * ORDER BY (COUNT(d.id) * 0.4 + COALESCE(SUM(d.economies_client), 0) / 1000 * 0.6) DESC
   * ```
   */
  const [ranking, setRanking] = useState<ApporteurRanking[]>([
    {
      id: '1',
      nom: 'Lambert',
      prenom: 'Thomas',
      initials: 'TL',
      position: 1,
      dossiersTraites: 32,
      economiesGenerees: 85600,
      evolutionPosition: 0,
      isNew: false
    },
    {
      id: '2',
      nom: 'Dubois',
      prenom: 'Marie',
      initials: 'MD',
      position: 2,
      dossiersTraites: 28,
      economiesGenerees: 74200,
      evolutionPosition: 1,
      isNew: false
    },
    {
      id: '3',
      nom: 'Roux',
      prenom: 'Emma',
      initials: 'ER',
      position: 3,
      dossiersTraites: 25,
      economiesGenerees: 68900,
      evolutionPosition: -1,
      isNew: false
    },
    {
      id: '4',
      nom: 'Bernard',
      prenom: 'Claire',
      initials: 'CB',
      position: 4,
      dossiersTraites: 24,
      economiesGenerees: 62450,
      evolutionPosition: 2,
      isNew: false
    },
    {
      id: '5',
      nom: 'Moreau',
      prenom: 'Julien',
      initials: 'JM',
      position: 5,
      dossiersTraites: 21,
      economiesGenerees: 58300,
      evolutionPosition: 0,
      isNew: true
    },
    {
      id: '6',
      nom: 'Petit',
      prenom: 'Lucas',
      initials: 'LP',
      position: 6,
      dossiersTraites: 19,
      economiesGenerees: 51200,
      evolutionPosition: -2,
      isNew: false
    },
    {
      id: '7',
      nom: 'Girard',
      prenom: 'Alice',
      initials: 'AG',
      position: 7,
      dossiersTraites: 17,
      economiesGenerees: 46700,
      evolutionPosition: 1,
      isNew: false
    },
    {
      id: '8',
      nom: 'Rousseau',
      prenom: 'Paul',
      initials: 'PR',
      position: 8,
      dossiersTraites: 15,
      economiesGenerees: 42800,
      evolutionPosition: 0,
      isNew: false
    },
    {
      id: '9',
      nom: 'Faure',
      prenom: 'Mathieu',
      initials: 'MF',
      position: 9,
      dossiersTraites: 13,
      economiesGenerees: 38400,
      evolutionPosition: 3,
      isNew: false
    },
    {
      id: '10',
      nom: 'Mercier',
      prenom: 'Sandrine',
      initials: 'SM',
      position: 10,
      dossiersTraites: 12,
      economiesGenerees: 35600,
      evolutionPosition: -1,
      isNew: false
    },
    {
      id: '11',
      nom: 'Boyer',
      prenom: 'Vincent',
      initials: 'VB',
      position: 11,
      dossiersTraites: 10,
      economiesGenerees: 31200,
      evolutionPosition: 1,
      isNew: false
    },
    {
      id: '12',
      nom: 'Noel',
      prenom: 'Isabelle',
      initials: 'IN',
      position: 12,
      dossiersTraites: 8,
      economiesGenerees: 28900,
      evolutionPosition: -2,
      isNew: false
    }
  ]);

  // ============================================================================
  // SUPABASE INTEGRATION - FONCTIONS DE RÉCUPÉRATION ET MISE À JOUR
  // ============================================================================

  /**
   * RÉCUPÉRATION DES APPORTEURS AVEC STATISTIQUES
   * 
   * Cette fonction doit récupérer tous les apporteurs
   * avec leurs statistiques de performance calculées
   */
  const fetchApporteurs = async () => {
    try {
      // SUPABASE: Récupération des apporteurs avec statistiques
      /*
      const { data: apporteursData, error } = await supabase
        .from('apporteurs_with_stats')
        .select('*')
        .in('statut', ['approuve', 'suspendu'])
        .order('date_inscription', { ascending: false });

      if (error) throw error;
      setApporteurs(apporteursData);
      */
    } catch (error) {
      console.error('Erreur récupération apporteurs:', error);
    }
  };

  /**
   * RÉCUPÉRATION DU CLASSEMENT COMPLET
   * 
   * Récupère le classement avec filtrage par période
   */
  const fetchRanking = async () => {
    setIsLoadingRanking(true);
    try {
      // SUPABASE: Récupération du classement filtré par période
      /*
      const { data: rankingData, error } = await supabase
        .rpc('get_apporteurs_ranking', {
          periode: timeFilter
        });

      if (error) throw error;
      setRanking(rankingData);
      */
      
      // Simulation temporaire
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Erreur récupération classement:', error);
    } finally {
      setIsLoadingRanking(false);
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

  // Récupération des données au montage
  useEffect(() => {
    fetchApporteurs();
    fetchRanking();
  }, []);

  // Récupération du classement quand le filtre change
  useEffect(() => {
    fetchRanking();
  }, [timeFilter]);

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

  const handleViewDetails = (apporteurId: string) => {
    router.push(`/admin/apporteurs/${apporteurId}`);
  };

  const handleCopyLink = async () => {
    const inviteLink = `${window.location.origin}/onboarding`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  // Filtrage et tri des apporteurs
  const filteredAndSortedApporteurs = useMemo(() => {
    let filtered = apporteurs.filter(apporteur => {
      const matchesSearch = searchQuery === '' || 
        `${apporteur.prenom} ${apporteur.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apporteur.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apporteur.entreprise && apporteur.entreprise.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'tous' || apporteur.statut === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'date_inscription' || sortField === 'derniere_connexion') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [apporteurs, searchQuery, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedApporteurs.length / itemsPerPage);
  const paginatedApporteurs = filteredAndSortedApporteurs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistiques générales
  const stats = useMemo(() => {
    const total = apporteurs.length;
    const actifs = apporteurs.filter(a => a.statut === 'approuve').length;
    const suspendus = apporteurs.filter(a => a.statut === 'suspendu').length;
    
    return { total, actifs, suspendus };
  }, [apporteurs]);

  const handleSort = (field: keyof Apporteur) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approuve: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Approuvé', icon: 'ri-check-line' },
      suspendu: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', text: 'Suspendu', icon: 'ri-pause-line' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <i className={`${config.icon} mr-1`}></i>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Configuration des positions pour le classement
  const getPositionConfig = (position: number) => {
    switch (position) {
      case 1:
        return {
          icon: 'ri-trophy-line',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-700'
        };
      case 2:
        return {
          icon: 'ri-medal-line',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          borderColor: 'border-gray-200 dark:border-gray-600'
        };
      case 3:
        return {
          icon: 'ri-award-line',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          borderColor: 'border-orange-200 dark:border-orange-700'
        };
      default:
        return {
          icon: 'ri-user-line',
          color: 'text-[#335FAD] dark:text-[#335FAD]/80',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
          borderColor: 'border-indigo-200 dark:border-indigo-700'
        };
    }
  };

  // Configuration de l'évolution
  const getEvolutionIcon = (evolution: number) => {
    if (evolution > 0) {
      return {
        icon: 'ri-arrow-up-line',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      };
    } else if (evolution < 0) {
      return {
        icon: 'ri-arrow-down-line',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30'
      };
    } else {
      return {
        icon: 'ri-subtract-line',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700'
      };
    }
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
      <AdminHeader 
        darkMode={darkMode} 
        setDarkMode={handleDarkModeToggle}
        adminData={adminData}
      />
      
      {/* Hero section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-2">
                Gestion des Apporteurs
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez les partenaires et analysez les performances
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-lg"></i>
                <span>Inviter un Apporteur</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total apporteurs</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center">
                <i className="ri-team-line text-[#335FAD] dark:text-[#335FAD] text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actifs</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.actifs}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <i className="ri-check-line text-green-600 dark:text-green-400 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspendus</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.suspendus}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <i className="ri-pause-line text-gray-600 dark:text-gray-400 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation par onglets avec correction du clipping */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-visible">
            <nav className="flex overflow-x-auto relative">
              <button
                onClick={() => setActiveTab('apporteurs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'apporteurs'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Liste des apporteurs ({stats.total})
              </button>
              <button
                onClick={() => setActiveTab('classement')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'classement'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                Classement ({ranking.length})
              </button>
            </nav>
          </div>

          {activeTab === 'apporteurs' && (
            <>
              {/* Barre de recherche et filtres */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                    <input
                      type="text"
                      placeholder="Rechercher par nom, email ou entreprise..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent transition-colors"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les statuts</SelectItem>
                      <SelectItem value="approuve">Approuvés</SelectItem>
                      <SelectItem value="suspendu">Suspendus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tableau des apporteurs */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('nom')}
                          className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                        >
                          <span>Apporteur</span>
                          {sortField === 'nom' && (
                            <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Statut
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('nb_dossiers_valides')}
                          className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                        >
                          <span>Performance</span>
                          {sortField === 'nb_dossiers_valides' && (
                            <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('chiffre_affaires')}
                          className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                        >
                          <span>CA</span>
                          {sortField === 'chiffre_affaires' && (
                            <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('date_inscription')}
                          className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                        >
                          <span>Inscription</span>
                          {sortField === 'date_inscription' && (
                            <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedApporteurs.map((apporteur) => (
                      <tr key={apporteur.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#335FAD] dark:bg-[#335FAD] rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {apporteur.prenom[0]}{apporteur.nom[0]}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {apporteur.prenom} {apporteur.nom}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {apporteur.email}
                              </div>
                              {apporteur.entreprise && (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {apporteur.entreprise}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(apporteur.statut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {apporteur.nb_dossiers_valides}/{apporteur.nb_dossiers_total}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {apporteur.taux_conversion}% conversion
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(apporteur.chiffre_affaires)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(apporteur.date_inscription)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(apporteur.id)}
                            className="text-[#335FAD] dark:text-[#335FAD]/80 hover:text-indigo-900 dark:hover:text-indigo-300 cursor-pointer"
                          >
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Afficher</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      résultats sur {filteredAndSortedApporteurs.length}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <i className="ri-arrow-left-s-line"></i>
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-[#335FAD] dark:bg-[#335FAD] text-white'
                                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-5

                      0 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'classement' && (
            <div className="p-6">
              {/* Header avec filtres */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                    <i className="ri-bar-chart-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
                    Classement des apporteurs
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Performance classée par nombre de dossiers traités et économies générées pour les clients
                  </p>
                </div>
                
                {/* Filtres temporels */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
                  {(['semaine', 'mois', 'trimestre'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimeFilter(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        timeFilter === period
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Liste du classement */}
              {isLoadingRanking ? (
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                        <div className="w-16 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-bar-chart-line text-gray-400 dark:text-gray-500 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucun classement disponible
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Les données de performance seront affichées dès qu'elles seront disponibles.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ranking.map((apporteur) => {
                    const positionConfig = getPositionConfig(apporteur.position);
                    const evolutionConfig = getEvolutionIcon(apporteur.evolutionPosition);
                    
                    return (
                      <div 
                        key={apporteur.id} 
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${
                          apporteur.position <= 3 
                            ? `${positionConfig.bgColor} ${positionConfig.borderColor}` 
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                        } overflow-hidden`}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                          {/* Position et évolution */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${positionConfig.bgColor}`}>
                              {apporteur.position <= 3 ? (
                                <i className={`${positionConfig.icon} ${positionConfig.color} text-lg`}></i>
                              ) : (
                                <span className={`font-bold ${positionConfig.color} text-sm`}>
                                  {apporteur.position}
                                </span>
                              )}
                            </div>
                            
                            {!apporteur.isNew && (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${evolutionConfig.bgColor} flex-shrink-0`}>
                                <i className={`${evolutionConfig.icon} ${evolutionConfig.color} text-xs`}></i>
                              </div>
                            )}
                            
                            {apporteur.isNew && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                Nouveau
                              </span>
                            )}
                          </div>

                          {/* Informations de l'apporteur */}
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-[#335FAD] dark:bg-[#335FAD] rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-medium">{apporteur.initials}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {apporteur.prenom} {apporteur.nom}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {apporteur.dossiersTraites} dossier{apporteur.dossiersTraites > 1 ? 's' : ''} traité{apporteur.dossiersTraites > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Économies générées */}
                        <div className="text-left sm:text-right flex-shrink-0 ml-12 sm:ml-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(apporteur.economiesGenerees)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Économies {timeFilter}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Inviter un nouvel apporteur
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Partagez ce lien d'inscription avec les nouveaux apporteurs. Ils pourront créer leur compte en toute autonomie.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Lien d'inscription
                      </label>
                      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2">
                        <code className="text-sm text-gray-900 dark:text-white break-all">
                          {typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : 'https://votre-domaine.com/onboarding'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center"
                >
                  {linkCopied ? (
                    <>
                      <i className="ri-check-line mr-2"></i>
                      Copié !
                    </>
                  ) : (
                    <>
                      <i className="ri-file-copy-line mr-2"></i>
                      Copier le lien
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
