'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApporteurHeader from '../../components/ApporteurHeader';
import { DossiersService } from '@/lib/services/dossiers';
import { getStatutBadgeConfig, mapStatutForDisplay } from '@/lib/utils/statut-mapping';
import { formatDate } from '@/lib/utils/formatters';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/services/api';
import { EmptyState } from '@/components/ui/empty-state';

// Interfaces et types
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
  file_path?: string;
  file_size?: number;
  file_type?: string;
  uploaded_at?: string;
}

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
  statut: string | null;
  type_dossier: string;
  date_creation: string | null;
  created_at: string | null;
  updated_at: string | null;
}

type SortField = 'date_creation' | 'updated_at' | 'statut' | 'numero_dossier' | 'clientNom';
type SortOrder = 'asc' | 'desc';
type FilterStatut = 'tous' | 'en_attente' | 'en_cours' | 'finalise' | 'refuse';

const DOSSIERS_PER_PAGE = 6; // Nombre de dossiers par page

export default function MesDossiersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('tous');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedDossiers, setSelectedDossiers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Utilisation du hook centralisé pour le dark mode
  const { darkMode, isInitialized, toggleDarkMode } = useTheme();
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Données utilisateur et dossiers
  const [userData, setUserData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    initials: '',
    role: 'Apporteur'
  });

  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  // Fonction pour récupérer tous les dossiers de l'utilisateur connecté
  const fetchDossiers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Récupérer le profil apporteur de l'utilisateur connecté
      const apporteur = await api.getCurrentApporteurProfile();
      if (apporteur) {
        setUserData({
          id: apporteur.id,
          firstName: apporteur.prenom,
          lastName: apporteur.nom,
          initials: `${apporteur.prenom.charAt(0)}${apporteur.nom.charAt(0)}`,
          role: 'Apporteur'
        });
        
        // Récupérer les dossiers de cet apporteur
        const dossiersData = await DossiersService.getDossiersByApporteur(apporteur.id);
        const normalized = (dossiersData || []).map((d: any) => ({
          ...d,
          statut: d.statut,
        }));
        setDossiers(normalized);
      } else {
        setError('Profil apporteur non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      setError('Erreur lors du chargement des dossiers');
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial quand l'auth est prête
  useEffect(() => {
    if (isInitialized && !authLoading && user) {
      fetchDossiers();
    }
  }, [isInitialized, authLoading, user]);

  // Rafraîchir les dossiers quand la fenêtre reprend le focus
  useEffect(() => {
    const onFocus = () => {
      if (isInitialized && !authLoading && user) {
        fetchDossiers();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isInitialized, authLoading, user]);

  // Utiliser le computed_statut fourni par la vue côté DB (via service)
  const withComputedStatut = useMemo(() => {
    return dossiers.map((d) => {
      const src = (d as any).computed_statut || d.statut || 'en_attente'
      const mapped = src === 'devis_envoye' ? 'devis_disponible' : src
      return { ...d, computed_statut: mapped }
    })
  }, [dossiers]);

  // Filtrage et tri des dossiers
  const filteredAndSortedDossiers = useMemo(() => {
    let filtered = withComputedStatut;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(dossier => 
        dossier.numero_dossier.toLowerCase().includes(searchLower) ||
        (dossier.client_infos && dossier.client_infos.length > 0 && (
          dossier.client_infos[0].client_nom.toLowerCase().includes(searchLower) ||
          dossier.client_infos[0].client_prenom.toLowerCase().includes(searchLower) ||
          dossier.client_infos[0].client_email.toLowerCase().includes(searchLower)
        ))
      );
    }

    if (filterStatut !== 'tous') {
      if (filterStatut === 'en_cours') {
        // En cours = tout sauf Finalisé
        filtered = filtered.filter(dossier => dossier.computed_statut !== 'finalise');
      } else {
        filtered = filtered.filter(dossier => dossier.computed_statut === filterStatut);
      }
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date_creation':
          aValue = new Date(a.date_creation || '');
          bValue = new Date(b.date_creation || '');
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || '');
          bValue = new Date(b.updated_at || '');
          break;
        case 'statut':
          aValue = (a as any).computed_statut || '';
          bValue = (b as any).computed_statut || '';
          break;
        case 'numero_dossier':
          aValue = a.numero_dossier;
          bValue = b.numero_dossier;
          break;
        case 'clientNom':
          aValue = a.client_infos && a.client_infos.length > 0 
            ? `${a.client_infos[0].client_nom} ${a.client_infos[0].client_prenom}`
            : '';
          bValue = b.client_infos && b.client_infos.length > 0 
            ? `${b.client_infos[0].client_nom} ${b.client_infos[0].client_prenom}`
            : '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [dossiers, searchTerm, filterStatut, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDossiers.length / DOSSIERS_PER_PAGE);
  const startIndex = (currentPage - 1) * DOSSIERS_PER_PAGE;
  const endIndex = startIndex + DOSSIERS_PER_PAGE;
  const currentDossiers = filteredAndSortedDossiers.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatut, sortField, sortOrder]);

  // Fonction pour changer de page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Statistiques
  const stats = useMemo(() => {
    const total = dossiers.length;
    const enCours = dossiers.filter(d => d.statut !== 'finalise').length;
    const finalises = dossiers.filter(d => d.statut === 'finalise').length;
    return { total, enCours, finalises };
  }, [dossiers]);

  // Gestionnaires d'événements
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSelectDossier = (dossierId: string) => {
    setSelectedDossiers(prev => 
      prev.includes(dossierId) 
        ? prev.filter(id => id !== dossierId)
        : [...prev, dossierId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDossiers.length === filteredAndSortedDossiers.length) {
      setSelectedDossiers([]);
    } else {
      setSelectedDossiers(filteredAndSortedDossiers.map(d => d.id));
    }
  };

  // NOUVELLE FONCTION: Gestion des clics sur les badges statistiques
  const handleStatBadgeClick = (statType: string) => {
    switch (statType) {
      case 'enCours':
        setFilterStatut('en_cours');
        break;
      case 'finalises':
        setFilterStatut('finalise');
        break;
      case 'total':
      default:
        setFilterStatut('tous');
        break;
    }
  };

  // ✅ MIGRATION COMPLÈTE - Utilisation des utilitaires centralisés

  // Charger les dossiers après initialisation du dark mode
  useEffect(() => {
    if (isInitialized) {
      fetchDossiers();
    }
  }, [isInitialized]);

  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de vos dossiers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => fetchDossiers()}
            className="bg-[#335FAD] text-white px-4 py-2 rounded-lg hover:bg-[#335FAD]/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header Général */}
      <ApporteurHeader 
        darkMode={darkMode} 
        setDarkMode={toggleDarkMode}
        userData={userData}
      />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
                Mes <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Dossiers</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Gérez et consultez tous vos dossiers clients
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <Link href="/nouveau-dossier" className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg cursor-pointer flex items-center space-x-3 whitespace-nowrap">
                <i className="ri-add-line text-xl"></i>
                <span>Nouveau Dossier</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Statistiques - BADGES CLIQUABLES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div 
            onClick={() => handleStatBadgeClick('total')}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${
              filterStatut === 'tous' ? 'ring-2 ring-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-file-list-line text-[#335FAD] dark:text-[#335FAD]/80"></i>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleStatBadgeClick('enCours')}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${
              filterStatut === 'en_cours' ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">{stats.enCours}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">En cours</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-loader-2-line text-yellow-600 dark:text-yellow-400"></i>
              </div>
            </div>
          </div>

          <div 
            onClick={() => handleStatBadgeClick('finalises')}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20 ${
              filterStatut === 'finalise' ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">{stats.finalises}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Finalisés</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-check-double-line text-purple-600 dark:text-purple-400"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Recherche */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, adresse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            {/* Bouton Filtres Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <i className="ri-filter-line"></i>
              <span>Filtres et Tri</span>
            </button>

            {/* Filtres Desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Filtre par statut */}
              <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as FilterStatut)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="finalise">Finalisés</SelectItem>
                  <SelectItem value="refuse">Refusés</SelectItem>
                </SelectContent>
              </Select>

              {/* Tri */}
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(v) => {
                  const [field, order] = v.split('-');
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at-desc">Plus récents</SelectItem>
                  <SelectItem value="updated_at-asc">Plus anciens</SelectItem>
                  <SelectItem value="date_creation-desc">Date création ↓</SelectItem>
                  <SelectItem value="date_creation-asc">Date création ↑</SelectItem>
                  <SelectItem value="statut-asc">Statut A-Z</SelectItem>
                  <SelectItem value="statut-desc">Statut Z-A</SelectItem>
                  <SelectItem value="clientNom-asc">Client A-Z</SelectItem>
                  <SelectItem value="clientNom-desc">Client Z-A</SelectItem>
                  <SelectItem value="numero_dossier-asc">N° Dossier ↑</SelectItem>
                  <SelectItem value="numero_dossier-desc">N° Dossier ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtres Mobile (Repliable) */}
          {showFilters && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filtrer par statut
                </label>
                <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v as FilterStatut)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="finalise">Finalisés</SelectItem>
                    <SelectItem value="refuse">Refusés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Trier par
                </label>
                <Select
                  value={`${sortField}-${sortOrder}`}
                  onValueChange={(v) => {
                    const [field, order] = v.split('-');
                    setSortField(field as SortField);
                    setSortOrder(order as SortOrder);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated_at-desc">Plus récents</SelectItem>
                    <SelectItem value="updated_at-asc">Plus anciens</SelectItem>
                    <SelectItem value="date_creation-desc">Date création ↓</SelectItem>
                    <SelectItem value="date_creation-asc">Date création ↑</SelectItem>
                    <SelectItem value="statut-asc">Statut A-Z</SelectItem>
                    <SelectItem value="statut-desc">Statut Z-A</SelectItem>
                    <SelectItem value="clientNom-asc">Client A-Z</SelectItem>
                    <SelectItem value="clientNom-desc">Client Z-A</SelectItem>
                    <SelectItem value="numero_dossier-asc">N° Dossier ↑</SelectItem>
                    <SelectItem value="numero_dossier-desc">N° Dossier ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Liste des Dossiers */}
        {filteredAndSortedDossiers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            {searchTerm || filterStatut !== 'tous' ? (
              <EmptyState
                icon="ri-search-line"
                title="Aucun résultat"
                description="Aucun dossier ne correspond à vos critères de recherche. Essayez de modifier vos filtres ou votre recherche."
                secondaryAction={{
                  label: "Réinitialiser les filtres",
                  onClick: () => {
                    setSearchTerm('');
                    setFilterStatut('tous');
                  }
                }}
              />
            ) : (
              <EmptyState
                icon="ri-folder-add-line"
                title="Commencez votre premier dossier"
                description="Vous n'avez pas encore de dossier. Créez-en un pour démarrer et suivre vos demandes d'assurance."
                action={{
                  label: "Créer mon premier dossier",
                  href: "/nouveau-dossier"
                }}
              />
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentDossiers.map((dossier) => {
                // ✅ Utilisation de la source de vérité unique
                const statutCanonique = (dossier as any).computed_statut || dossier.statut || 'en_attente';
                const statutConfig = getStatutBadgeConfig(statutCanonique);
                const clientInfo = dossier.client_infos && dossier.client_infos.length > 0 ? dossier.client_infos[0] : null;
                const pretInfo = dossier.pret_data && dossier.pret_data.length > 0 ? dossier.pret_data[0] : null;
                
                return (
                  <div key={dossier.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900/20 transition-all duration-200">
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Informations principales */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <h3 className="text-2xl font-medium text-gray-900 dark:text-white">
                                {clientInfo ? `${clientInfo.client_prenom} ${clientInfo.client_nom}` : 'Client inconnu'}
                              </h3>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {dossier.numero_dossier}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Modifié le {dossier.updated_at ? formatDate(dossier.updated_at, true) : 'N/A'}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statutConfig?.color || 'bg-gray-100 text-gray-800'}`}>
                              <i className={`${statutConfig?.icon || 'ri-question-line'} mr-1`}></i>
                              {statutConfig?.text || 'Inconnu'}
                            </span>
                            {dossier.type_dossier === 'couple' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                                <i className="ri-heart-line mr-1"></i>
                                Couple
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Email :</span>
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {clientInfo?.client_email || 'N/A'}
                              </p>
                            </div>
                            
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Montant :</span>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {pretInfo ? `${pretInfo.montant_capital.toLocaleString()}€` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dossier/${dossier.id}`}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-2"
                          >
                            <i className="ri-eye-line text-sm"></i>
                            <span className="hidden sm:inline">Voir</span>
                          </Link>
                          
                          <button className="bg-[#335FAD]/10 dark:bg-[#335FAD]/20 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]/80 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-2">
                            <i className="ri-download-line text-sm"></i>
                            <span className="hidden sm:inline">Export</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Info pagination */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredAndSortedDossiers.length)} sur {filteredAndSortedDossiers.length} dossiers
                </div>

                {/* Contrôles pagination */}
                <div className="flex items-center space-x-2">
                  {/* Bouton Précédent */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <i className="ri-arrow-left-line"></i>
                  </button>

                  {/* Numéros de page */}
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
                      disabled={page === '...'}
                      className={`px-3 py-2 text-sm border rounded-lg cursor-pointer ${
                        page === currentPage
                          ? 'bg-[#335FAD] border-[#335FAD] text-white'
                          : page === '...'
                          ? 'border-transparent text-gray-400 dark:text-gray-500 cursor-default'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Bouton Suivant */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <i className="ri-arrow-right-line"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats en bas (si pas de pagination) */}
        {totalPages <= 1 && filteredAndSortedDossiers.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Affichage de {filteredAndSortedDossiers.length} dossier{filteredAndSortedDossiers.length > 1 ? 's' : ''} sur {dossiers.length} au total
            </p>
          </div>
        )}
      </main>
    </div>
  );
}