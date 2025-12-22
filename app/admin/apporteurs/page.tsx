
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminHeader from '../../../components/AdminHeader';
import { ApporteursService } from '@/lib/services/apporteurs';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { getApporteurBadgeConfig } from '@/lib/utils/apporteur-badges';
import { InviteModal } from '@/components/features/invites/InviteModal';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/AuthProvider';

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
  adresse: string;
  date_inscription: string;
  statut: 'actif' | 'inactif' | 'suspendu';
  derniere_connexion?: string;
  // Statistiques calculées
  nb_dossiers_total: number;
  nb_dossiers_valides: number;
  chiffre_affaires: number;
  taux_conversion: number;
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { currentBrokerId } = useBrokerContext();
  const { user } = useAuth();

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

  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DES DONNÉES APPORTEURS
  // ============================================================================

  /**
   * ÉTAT PRINCIPAL DES APPORTEURS - CONNECTÉ À SUPABASE
   */
  const [apporteurs, setApporteurs] = useState<Apporteur[]>([]);
  const [isLoadingApporteurs, setIsLoadingApporteurs] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // ============================================================================
  // SUPABASE INTEGRATION - FONCTIONS DE RÉCUPÉRATION ET MISE À JOUR
  // ============================================================================

  /**
   * RÉCUPÉRATION DES APPORTEURS AVEC STATISTIQUES
   */
  const fetchApporteurs = async () => {
    try {
      setIsLoadingApporteurs(true);
      setError(null);

      const data = await ApporteursService.getAllApporteurs(currentBrokerId || undefined);

      console.log('🔍 [DEBUG PAGE GLOBALE] Données brutes de getAllApporteurs:', JSON.stringify(data, null, 2));

      // Calculer les statistiques pour chaque apporteur en utilisant la méthode centralisée
      const apporteursWithStats = data.map((apporteur: any) => {
        const dossiers = apporteur.dossiers || [];

        console.log(`🔍 [DEBUG] Apporteur ${apporteur.prenom} ${apporteur.nom}:`, {
          nbDossiers: dossiers.length,
          dossiers: dossiers.map((d: any) => ({ id: d.id, statut: d.statut, economie: d.economie_generee }))
        });

        // Utiliser la méthode centralisée de calcul des stats pour garantir la cohérence
        const stats = ApporteursService.calculateApporteurStats(dossiers);

        console.log(`✅ [DEBUG] Stats calculées pour ${apporteur.prenom} ${apporteur.nom}:`, stats);

        // Déterminer le statut réel de l'apporteur (inactif si pas d'activité depuis 2 mois)
        const lastLoginAt = apporteur.last_login_at || apporteur.updated_at;
        const estInactif = ApporteursService.isApporteurInactif(lastLoginAt, dossiers);

        // Override du statut si l'apporteur est inactif automatiquement
        let statutFinal = apporteur.statut;
        if (statutFinal === 'actif' && estInactif) {
          statutFinal = 'inactif';
        }

        return {
          id: apporteur.id,
          user_id: apporteur.user_id,
          nom: apporteur.nom,
          prenom: apporteur.prenom,
          email: apporteur.email,
          telephone: apporteur.telephone || 'Non renseigné',
          adresse: '', // Non disponible dans DB
          date_inscription: apporteur.created_at,
          statut: statutFinal, // Utilise le statut final (avec vérification d'inactivité)
          derniere_connexion: lastLoginAt,
          nb_dossiers_total: stats.totalDossiers,
          nb_dossiers_valides: stats.dossiersValides,
          chiffre_affaires: stats.economiesGenerees,
          taux_conversion: stats.tauxConversion
        };
      });

      setApporteurs(apporteursWithStats);
    } catch (error: any) {
      console.error('Erreur récupération apporteurs:', error);
      setError(error.message || 'Erreur lors du chargement des apporteurs');
    } finally {
      setIsLoadingApporteurs(false);
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
    if (currentBrokerId) {
      fetchApporteurs();
    }
  }, [currentBrokerId]);

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

  // Filtrage et tri des apporteurs
  const filteredAndSortedApporteurs = useMemo(() => {
    let filtered = apporteurs.filter(apporteur => {
      const matchesSearch = searchQuery === '' ||
        `${apporteur.prenom} ${apporteur.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apporteur.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'tous' || apporteur.statut === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle sort for specific date fields
      if (sortField === 'date_inscription' || sortField === 'derniere_connexion') {
        const aTime = aValue ? new Date(aValue as string).getTime() : 0;
        const bTime = bValue ? new Date(bValue as string).getTime() : 0;
        if (aTime < bTime) return sortDirection === 'asc' ? -1 : 1;
        if (aTime > bTime) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      // Safe string conversion
      const aString = String(aValue || '').toLowerCase();
      const bString = String(bValue || '').toLowerCase();

      // Compare as strings if they look like strings, otherwise compare values
      if (typeof aValue === 'string' || typeof bValue === 'string') {
        if (aString < bString) return sortDirection === 'asc' ? -1 : 1;
        if (aString > bString) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      // Default comparison for numbers/others
      if ((aValue ?? 0) < (bValue ?? 0)) return sortDirection === 'asc' ? -1 : 1;
      if ((aValue ?? 0) > (bValue ?? 0)) return sortDirection === 'asc' ? 1 : -1;
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

  // Statistiques générales (calcul corrigé avec détection automatique d'inactivité)
  const stats = useMemo(() => {
    const total = apporteurs.length;
    // Les apporteurs affichés dans 'apporteurs' ont déjà leur statut calculé avec isApporteurInactif
    const actifs = apporteurs.filter(a => a.statut === 'actif').length;
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

  // ✅ Utilisation des badges centralisés depuis lib/utils/apporteur-badges.ts
  const getStatusBadge = (status: string) => {
    const config = getApporteurBadgeConfig(status);

    if (!config) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Inconnu
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <i className={`${config.icon} mr-1`}></i>
        {config.text}
      </span>
    );
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
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'apporteurs'
                  ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                Liste des apporteurs ({stats.total})
              </button>
            </nav>
          </div>

          {activeTab === 'apporteurs' && (
            <>
              {/* État de chargement */}
              {isLoadingApporteurs ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD]"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des apporteurs...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                    <i className="ri-error-warning-line text-3xl text-red-600 dark:text-red-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Erreur de chargement</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <button
                    onClick={fetchApporteurs}
                    className="px-4 py-2 bg-[#335FAD] text-white rounded-lg hover:bg-[#2a4d8f] transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <>
                  {/* Barre de recherche et filtres */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                          type="text"
                          placeholder="Rechercher par nom ou email..."
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
                          <SelectItem value="actif">Actifs</SelectItem>
                          <SelectItem value="inactif">Inactifs</SelectItem>
                          <SelectItem value="suspendu">Suspendus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tableau des apporteurs */}
                  {paginatedApporteurs.length === 0 ? (
                    <EmptyState
                      icon="ri-user-add-line"
                      title={searchQuery || statusFilter !== 'tous' ? "Aucun résultat" : "Aucun apporteur"}
                      description={
                        searchQuery || statusFilter !== 'tous'
                          ? "Aucun apporteur ne correspond à vos critères. Modifiez vos filtres."
                          : "Vous n'avez pas encore d'apporteur. Invitez-en un pour commencer à collaborer."
                      }
                      action={!searchQuery && statusFilter === 'tous' ? {
                        label: "Inviter un apporteur",
                        onClick: () => setShowInviteModal(true)
                      } : undefined}
                      secondaryAction={searchQuery || statusFilter !== 'tous' ? {
                        label: "Réinitialiser les filtres",
                        onClick: () => {
                          setSearchQuery('');
                          setFilterStatut('tous');
                        }
                      } : undefined}
                    />
                  ) : (
                  <div className="overflow-x-auto">
                    {/* Version desktop */}
                    <div className="hidden lg:block">
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
                                  {formatCurrency(apporteur.chiffre_affaires, { decimals: 0 })}
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

                    {/* Version mobile/tablette - cartes empilées */}
                    <div className="lg:hidden">
                      <div className="p-4 space-y-4">
                        {paginatedApporteurs.map((apporteur) => (
                          <div
                            key={apporteur.id}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-start justify-between mb-3">
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
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {apporteur.email}
                                  </div>
                                </div>
                              </div>
                              {getStatusBadge(apporteur.statut)}
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">Performance</span>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {apporteur.nb_dossiers_valides}/{apporteur.nb_dossiers_total}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {apporteur.taux_conversion}% conversion
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">CA</span>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(apporteur.chiffre_affaires)}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                              Inscrit le {formatDate(apporteur.date_inscription)}
                            </div>

                            <button
                              onClick={() => handleViewDetails(apporteur.id)}
                              className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                            >
                              Voir détails
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}

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
                                className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${currentPage === pageNum
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
            </>
          )}

        </div>
      </main>

      {/* Modal d'invitation (Centralized Feature 2) */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteType="apporteur"
      />
    </div>
  );
}
