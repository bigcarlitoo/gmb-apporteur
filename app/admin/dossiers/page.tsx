
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import { DossiersService } from '@/lib/services/dossiers';
import { ApporteursService } from '@/lib/services/apporteurs';
import { DossierReadStatusService } from '@/lib/services/dossier-read-status';
import { ReadStatusCache } from '@/lib/services/read-status-cache';
import DossierCard from '@/components/DossierCard';
import { mapStatutForDisplay, getStatutBadgeConfig } from '@/lib/utils/statut-mapping';
import { formatCurrency, formatDate, getAgeColor } from '@/lib/utils/formatters';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/AuthProvider';

// Interface pour les données admin
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour un dossier (adaptée aux données Supabase)
interface Dossier {
  id: string;
  numero_dossier: string;
  apporteur_id: string | null;
  client_infos: Array<{
    client_nom: string;
    client_prenom: string;
    client_email: string;
    client_telephone: string | null;
  }>;
  pret_data: Array<{
    montant_capital: number;
    banque_preteuse: string;
    duree_mois: number;
    type_pret: string;
  }>;
  apporteur_profiles: {
    nom: string;
    prenom: string;
    email: string;
  } | null;
  statut: string | null; // canonique DB: en_attente, devis_disponible, devis_accepte, refuse, finalise
  type_dossier: string;
  is_couple: boolean;
  date_creation: string | null;
  age_jours?: number;
  is_read?: boolean;
  devis?: Array<{ id: string; statut: string | null; date_generation?: string | null }>;
  admin_status?: 'nouveau' | 'devis_envoye' | 'valide' | 'refuse' | 'finalise';
}

// Interface pour un apporteur avec compteur
interface ApporteurWithCount {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  nouveauxDossiers: number;
  totalDossiers: number;
}

export default function AdminDossiersPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'tous' | 'nouveau' | 'en_cours' | 'devis_envoye' | 'valide' | 'refuse' | 'finalise'>('tous');
  const [selectedApporteur, setSelectedApporteur] = useState('');
  const [sortField, setSortField] = useState<keyof Dossier>('date_creation');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [apporteurs, setApporteurs] = useState<ApporteurWithCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unreadStats, setUnreadStats] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(false);
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

  /**
   * 🎯 Dérive le statut admin depuis le statut canonique
   * ✅ Utilise l'utilitaire centralisé pour garantir la cohérence
   */
  const deriveAdminStatus = (d: any): Dossier['admin_status'] => {
    // Priorité : computed_statut (depuis la vue) > statut (devrait être statut_canon)
    const statutCanonique = (d?.computed_statut || d?.statut || 'en_attente').toString();

    // ✅ Utilise la fonction centralisée de mapping
    return mapStatutForDisplay(statutCanonique) as Dossier['admin_status'];
  };

  // Chargement des dossiers et apporteurs depuis Supabase
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Charger les dossiers
        const dossiersData = await DossiersService.getAllDossiers(currentBrokerId || undefined);

        // Dériver un statut admin rétroactif depuis devis (si présent dans la requête)
        const dossiersWithDerived = dossiersData.map((d: any) => ({
          ...d,
          admin_status: deriveAdminStatus(d)
        }))

        // Ajouter l'âge en jours, admin_status et fusionner avec le cache local
        const dossiersWithAge = dossiersData.map((dossier: any) => {
          const cachedStatus = ReadStatusCache.getReadStatus(dossier.id);
          const finalIsRead = cachedStatus !== null ? cachedStatus : dossier.is_read;
          const admin_status = deriveAdminStatus(dossier);

          return {
            ...dossier,
            is_read: finalIsRead,
            admin_status,
            age_jours: dossier.date_creation
              ? Math.floor((Date.now() - new Date(dossier.date_creation).getTime()) / (1000 * 60 * 60 * 24))
              : 0
          } as Dossier;
        });

        setDossiers(dossiersWithDerived);

        // Charger les apporteurs avec leurs statistiques
        const apporteursData = await ApporteursService.getAllApporteurs(currentBrokerId || undefined);

        const apporteursWithStats = apporteursData.map((apporteur: any) => {
          const totalDossiers = apporteur.dossiers?.length || 0;
          const nouveauxDossiers = apporteur.dossiers?.filter((d: any) =>
            (d.statut === 'en_attente' || d.statut === 'nouveau')
          ).length || 0;

          return {
            id: apporteur.id,
            nom: apporteur.nom,
            prenom: apporteur.prenom,
            email: apporteur.email,
            totalDossiers,
            nouveauxDossiers
          };
        });

        setApporteurs(apporteursWithStats);

      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshKey, currentBrokerId]);

  // Rafraîchir la liste au retour sur l’onglet/fenêtre
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Synchroniser le cache au montage et au démontage
  useEffect(() => {
    // Forcer la synchronisation au montage
    ReadStatusCache.forceSync();

    // Debug: Afficher le cache
    console.log('🔍 Cache au montage:', ReadStatusCache);

    // Nettoyer les timeouts au démontage
    return () => {
      ReadStatusCache.forceSync();
    };
  }, []);

  // Écouter les synchronisations du cache
  useEffect(() => {
    const unsubscribe = ReadStatusCache.onSync(() => {
      // Mettre à jour les dossiers avec le cache après synchronisation
      setDossiers(prev => prev.map(dossier => {
        const cachedStatus = ReadStatusCache.getReadStatus(dossier.id);
        return cachedStatus !== null ? { ...dossier, is_read: cachedStatus } : dossier;
      }));
    });

    return unsubscribe;
  }, []);

  // Calculer les stats de dossiers non lus quand les dossiers changent
  useEffect(() => {
    updateUnreadStats();
  }, [dossiers]);

  // Détecter si on est en mobile/tablette
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Les apporteurs sont maintenant chargés depuis la DB dans useEffect

  // Fonction pour marquer un dossier comme lu (optimiste)
  const markDossierAsRead = (dossierId: string) => {
    // Mise à jour optimiste immédiate
    setDossiers(prev => prev.map(dossier =>
      dossier.id === dossierId ? { ...dossier, is_read: true } : dossier
    ));

    // Ajouter au cache pour synchronisation en arrière-plan
    ReadStatusCache.markAsReadOptimistic(dossierId);

    // Recalculer les stats des apporteurs
    updateUnreadStats();
  };

  // Fonction pour mettre à jour les stats de dossiers non lus
  const updateUnreadStats = () => {
    const stats: Record<string, number> = {};

    dossiers.forEach(dossier => {
      if (!dossier.is_read && dossier.apporteur_profiles) {
        const apporteurId = dossier.apporteur_id;
        if (apporteurId) {
          stats[apporteurId] = (stats[apporteurId] || 0) + 1;
        }
      }
    });

    setUnreadStats(stats);
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

  const handleViewDetails = (dossierId: string) => {
    router.push(`/admin/dossiers/${dossierId}`);
  };

  // Gestionnaire pour le bouton Nouveau Dossier Admin
  const handleNouveauDossierAdmin = () => {
    router.push('/admin/nouveau-dossier');
  };

  // Fonction pour gérer les clics sur les cartes de statistiques
  const handleStatBadgeClick = (statType: string) => {
    switch (statType) {
      case 'nouveaux':
        setSelectedStatus('nouveau');
        break;
      case 'enCours':
        setSelectedStatus('en_cours');
        break;
      case 'total':
      default:
        setSelectedStatus('tous');
        break;
    }
    setCurrentPage(1);
  };

  // Filtrage et tri des dossiers
  const filteredAndSortedDossiers = useMemo(() => {
    let filtered = dossiers.filter(dossier => {
      const matchesSearch = searchQuery === '' ||
        dossier.numero_dossier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dossier.client_infos && dossier.client_infos.length > 0 &&
          `${dossier.client_infos[0].client_prenom} ${dossier.client_infos[0].client_nom}`.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === 'tous' ||
        (selectedStatus === 'en_cours' ? (dossier.admin_status !== 'finalise') : dossier.admin_status === selectedStatus);

      // Filtre par apporteur
      const matchesApporteur = selectedApporteur === '' ||
        (dossier.apporteur_profiles &&
          `${dossier.apporteur_profiles.prenom} ${dossier.apporteur_profiles.nom}` === selectedApporteur);

      return matchesSearch && matchesStatus && matchesApporteur;
    });

    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'date_creation') {
        aValue = new Date(a.date_creation || 0).getTime();
        bValue = new Date(b.date_creation || 0).getTime();
      } else if (sortField === 'pret_data') {
        aValue = a.pret_data && a.pret_data.length > 0 ? a.pret_data[0].montant_capital : 0;
        bValue = b.pret_data && b.pret_data.length > 0 ? b.pret_data[0].montant_capital : 0;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
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
  }, [dossiers, searchQuery, selectedStatus, selectedApporteur, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDossiers.length / itemsPerPage);
  const paginatedDossiers = filteredAndSortedDossiers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistiques calculées depuis les données
  const stats = useMemo(() => {
    const total = dossiers.length;
    const nouveaux = dossiers.filter(d => d.admin_status === 'nouveau').length;
    // En cours = tout sauf Finalisé
    const enCours = dossiers.filter(d => d.admin_status !== 'finalise').length;

    return { total, nouveaux, enCours };
  }, [dossiers]);

  // Compteurs par statut (admin)
  const statusCounts = useMemo(() => {
    return {
      tous: dossiers.length,
      nouveau: dossiers.filter(d => d.admin_status === 'nouveau').length,
      en_cours: dossiers.filter(d => d.admin_status !== 'finalise').length,
      devis_envoye: dossiers.filter(d => d.admin_status === 'devis_envoye').length,
      valide: dossiers.filter(d => d.admin_status === 'valide').length,
      finalise: dossiers.filter(d => d.admin_status === 'finalise').length,
      refuse: dossiers.filter(d => d.admin_status === 'refuse').length
    };
  }, [dossiers]);

  const handleSort = (field: keyof Dossier) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * 🎯 Badge de statut - Utilise la source de vérité unique
   * Note: adminStatus est déjà le résultat de mapStatutForDisplay()
   */
  const getStatusBadge = (adminStatus?: Dossier['admin_status']) => {
    // adminStatus est déjà mappé, on doit le "remonter" au statut canonique
    const reversMap: Record<string, string> = {
      'nouveau': 'en_attente',
      'devis_envoye': 'devis_disponible',
      'valide': 'devis_accepte',
      'refuse': 'refuse',
      'finalise': 'finalise'
    };

    const statutCanonique = reversMap[adminStatus || 'nouveau'] || 'en_attente';
    const config = getStatutBadgeConfig(statutCanonique);

    if (!config) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Inconnu
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // ✅ Utilisation des formatters centralisés depuis lib/utils/formatters.ts

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des dossiers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#335FAD] hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
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

      {/* Hero redesigné */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-2">
                Gestion des Dossiers
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Supervisez et traitez tous les dossiers d'assurance de prêt
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleNouveauDossierAdmin}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-lg"></i>
                <span>Créer un Dossier</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {/* Statistiques - CARTES CLIQUABLES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => handleStatBadgeClick('total')}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${selectedStatus === 'tous' ? 'ring-2 ring-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10' : ''
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total des dossiers</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-line text-[#335FAD] dark:text-[#335FAD] text-xl"></i>
              </div>
            </div>
          </div>

          <div
            onClick={() => handleStatBadgeClick('nouveaux')}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${selectedStatus === 'nouveau' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouveaux dossiers</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.nouveaux}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <i className="ri-file-add-line text-green-600 dark:text-green-400 text-xl"></i>
              </div>
            </div>
          </div>

          <div
            onClick={() => handleStatBadgeClick('enCours')}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${selectedStatus === 'en_cours' ? 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-900/20' : ''
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En cours</p>
                <p className="text-2xl font-light text-gray-900 dark:text-white">{stats.enCours}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-orange-600 dark:text-orange-400 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des apporteurs scrollable - Marge augmentée */}
        <div className="mb-8 pt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Apporteurs</h3>
          <div className="flex gap-3 overflow-x-auto pb-3 pt-2">
            <button
              onClick={() => {
                setSelectedApporteur('');
                setCurrentPage(1);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all duration-200 hover:shadow-md cursor-pointer ${selectedApporteur === ''
                ? 'bg-[#335FAD] dark:bg-[#335FAD] text-white border-[#335FAD] dark:border-[#335FAD] shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              Tous les apporteurs
            </button>
            {apporteurs.map(apporteur => (
              <button
                key={apporteur.id}
                onClick={() => {
                  setSelectedApporteur(`${apporteur.prenom} ${apporteur.nom}`);
                  setCurrentPage(1);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full border-2 whitespace-nowrap transition-all duration-200 hover:shadow-md relative cursor-pointer ${selectedApporteur === `${apporteur.prenom} ${apporteur.nom}`
                  ? 'bg-[#335FAD] dark:bg-[#335FAD] text-white border-[#335FAD] dark:border-[#335FAD] shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                {apporteur.prenom} {apporteur.nom}
                {(unreadStats[apporteur.id] || 0) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium shadow-lg">
                    {unreadStats[apporteur.id] > 9 ? '9+' : unreadStats[apporteur.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Onglets par statut (admin) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              {[
                { key: 'tous', label: 'Tous', count: statusCounts.tous },
                { key: 'nouveau', label: 'Nouveau', count: statusCounts.nouveau },
                { key: 'en_cours', label: 'En cours', count: statusCounts.en_cours },
                { key: 'devis_envoye', label: 'Devis envoyé', count: statusCounts.devis_envoye },
                { key: 'valide', label: 'Validé', count: statusCounts.valide },
                { key: 'finalise', label: 'Finalisé', count: statusCounts.finalise },
                { key: 'refuse', label: 'Refusé', count: statusCounts.refuse }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedStatus(tab.key as any);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${selectedStatus === tab.key
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Barre de recherche */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative max-w-md">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
              <input
                type="text"
                placeholder="Rechercher par numéro, client ou apporteur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#335FAD] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Tableau responsive amélioré - COLONNE PRIORITÉ SUPPRIMÉE */}
          <div className="overflow-x-auto">
            {/* Version desktop */}
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort('numero_dossier')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                      >
                        <span>Numéro</span>
                        {sortField === 'numero_dossier' && (
                          <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Client
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Apporteur
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Statut
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort('pret_data')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                      >
                        <span>Montant</span>
                        {sortField === 'pret_data' && (
                          <i className={`ri-arrow-${sortDirection === 'asc' ? 'up' : 'down'}-line`}></i>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleSort('date_creation')}
                        className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                      >
                        <span>Date</span>
                        {sortField === 'date_creation' && (
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
                  {paginatedDossiers.map((dossier) => (
                    <tr
                      key={dossier.id}
                      className={`transition-colors duration-700 ease-out ${!dossier.is_read
                        ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      onMouseEnter={() => !isMobile && !dossier.is_read && markDossierAsRead(dossier.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dossier.numero_dossier}
                          </div>
                          {/* Indicateur de synchronisation */}
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                            style={{ display: ReadStatusCache.hasPendingUpdates(dossier.id) ? 'block' : 'none' }}
                            title="Synchronisation en cours...">
                          </div>
                        </div>
                        {dossier.age_jours !== undefined && (
                          <div className={`text-xs ${getAgeColor(dossier.age_jours)}`}>
                            {dossier.age_jours}j
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {(dossier.client_infos && dossier.client_infos.length > 0) ?
                              `${dossier.client_infos[0].client_prenom} ${dossier.client_infos[0].client_nom}` :
                              'N/A'
                            }
                          </div>
                          {dossier.is_couple ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              <i className="ri-team-line mr-1 text-xs"></i>
                              Couple
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              <i className="ri-user-line mr-1 text-xs"></i>
                              Seul
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {dossier.apporteur_profiles ?
                            `${dossier.apporteur_profiles.prenom} ${dossier.apporteur_profiles.nom}` :
                            'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(dossier.admin_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {(dossier.pret_data && dossier.pret_data.length > 0) ?
                            formatCurrency(dossier.pret_data[0].montant_capital, { compact: true }) :
                            'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {dossier.date_creation ? formatDate(dossier.date_creation) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(dossier.id)}
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
                {paginatedDossiers.map((dossier) => (
                  <DossierCard
                    key={dossier.id}
                    dossierId={dossier.id}
                    isRead={dossier.is_read || false}
                    onMarkAsRead={markDossierAsRead}
                    isResponsive={true}
                  >
                    <div
                      className={`rounded-lg p-4 border transition-colors duration-700 ease-out ${!dossier.is_read
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dossier.numero_dossier}
                          </div>
                          {dossier.age_jours !== undefined && (
                            <div className={`text-xs ${getAgeColor(dossier.age_jours)}`}>
                              {dossier.age_jours}j
                            </div>
                          )}
                        </div>
                        {getStatusBadge(dossier.admin_status)}
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(dossier.client_infos && dossier.client_infos.length > 0) ?
                              `${dossier.client_infos[0].client_prenom} ${dossier.client_infos[0].client_nom}` :
                              'N/A'
                            }
                          </span>
                          {dossier.is_couple ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              <i className="ri-team-line mr-1 text-xs"></i>
                              Couple
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              <i className="ri-user-line mr-1 text-xs"></i>
                              Seul
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Apporteur: {dossier.apporteur_profiles ?
                            `${dossier.apporteur_profiles.prenom} ${dossier.apporteur_profiles.nom}` :
                            'N/A'
                          }
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(dossier.pret_data && dossier.pret_data.length > 0) ?
                              formatCurrency(dossier.pret_data[0].montant_capital, { compact: true }) :
                              'N/A'
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {dossier.date_creation ? formatDate(dossier.date_creation) : 'N/A'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewDetails(dossier.id)}
                        className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                      >
                        Voir détails
                      </button>
                    </div>
                  </DossierCard>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination améliorée */}
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
                  résultats sur {filteredAndSortedDossiers.length}
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
                          ? 'bg-indigo-600 dark:bg-indigo-5 0 text-white'
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
                  className="px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          </div>

          {/* État vide */}
          {paginatedDossiers.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              {searchQuery || selectedStatus !== 'tous' || selectedApporteur ? (
                <EmptyState
                  icon="ri-search-line"
                  title="Aucun résultat"
                  description="Aucun dossier ne correspond à vos critères. Essayez de modifier vos filtres."
                  secondaryAction={{
                    label: "Réinitialiser les filtres",
                    onClick: () => {
                      setSearchQuery('');
                      setSelectedStatus('tous');
                      setSelectedApporteur('');
                    }
                  }}
                />
              ) : (
                <EmptyState
                  icon="ri-inbox-line"
                  title="Aucun dossier"
                  description="Vos dossiers apparaîtront ici une fois que vos apporteurs en auront créé."
                  action={{
                    label: "Créer un dossier",
                    href: "/admin/nouveau-dossier"
                  }}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
