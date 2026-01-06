'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import { ActivitiesService } from '@/lib/services/activities';
import { ApporteursService } from '@/lib/services/apporteurs';
import { ActivityReadStatusCache } from '@/lib/services/activity-read-status-cache';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/AuthProvider';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { useMemo } from 'react';

// Interface pour les activités admin
interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string;
  activity_data?: any;
  created_at: string;
  is_read: boolean;
  dossier_id?: string;
  // Données depuis activities_view
  apporteur_nom?: string;
  apporteur_prenom?: string;
  client_nom?: string;
  client_prenom?: string;
  numero_dossier?: string;
  economie_generee?: number;
  montant_capital?: number;
  // Propriétés formatées
  type?: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
  amount?: string;
  status?: string;
  time?: string;
}

interface Apporteur {
  id: string;
  nom: string;
  prenom: string;
}

const ITEMS_PER_PAGE = 20;

export default function AdminActivitesPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // États pour les activités
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Liste des apporteurs pour le filtre
  const [apporteurs, setApporteurs] = useState<Apporteur[]>([]);
  
  // États pour les filtres
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'success' | 'info' | 'warning' | 'error'>('all');
  const [filterApporteur, setFilterApporteur] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);

  const { user } = useAuth();
  const { currentBrokerId } = useBrokerContext();

  // ✅ Données admin depuis l'utilisateur connecté
  const adminData = useMemo(() => {
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

  // Données paginées
  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredActivities.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterType, filterApporteur, showUnreadOnly]);

  // Fonction pour changer de page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Fonction pour formater les activités pour l'affichage
  const formatActivityForDisplay = (activity: any): Activity => {
    const activityData = activity.activity_data || {};
    
    // Déterminer le type et l'icône selon le type d'activité
    let type: 'success' | 'info' | 'warning' | 'error' = 'info';
    let icon = 'ri-file-line';
    let amount = '';
    let status = '';
    
    switch (activity.activity_type) {
      case 'dossier_created':
        type = 'info';
        icon = 'ri-file-add-line';
        status = 'Nouveau dossier';
        break;
        
      case 'devis_envoye':
        type = 'info';
        icon = 'ri-send-plane-line';
        status = 'Devis envoyé';
        break;
        
      case 'devis_accepte':
        type = 'success';
        icon = 'ri-check-double-line';
        amount = activity.economie_generee ? `Économie : ${Number(activity.economie_generee).toLocaleString()}€` : '';
        status = 'Devis accepté';
        break;
        
      case 'devis_refuse':
        type = 'error';
        icon = 'ri-close-circle-line';
        status = 'Devis refusé';
        break;
        
      case 'dossier_finalise':
        type = 'success';
        icon = 'ri-checkbox-circle-line';
        amount = activity.economie_generee ? `Économie : ${Number(activity.economie_generee).toLocaleString()}€` : '';
        status = 'Dossier finalisé';
        break;
        
      case 'dossier_attribue':
        type = 'info';
        icon = 'ri-user-received-line';
        status = 'Attribué';
        break;
        
      case 'dossier_supprime':
        type = 'error';
        icon = 'ri-delete-bin-line';
        status = 'Supprimé';
        break;
        
      default:
        type = 'info';
        icon = 'ri-file-line';
        status = 'Activité';
    }

    return {
      ...activity,
      type,
      icon,
      amount,
      status,
      time: formatTimeAgo(activity.created_at)
    };
  };

  // Fonctions
  const fetchActivities = async () => {
    if (!currentBrokerId) {
      console.log('[AdminActivitesPage] Pas de broker sélectionné, activités vides');
      setActivities([]);
      setFilteredActivities([]);
      return;
    }

    setActivitiesLoading(true);
    try {
      const data = await ActivitiesService.getAllActivities(currentBrokerId);
      
      // Formater et fusionner avec le cache local
      const formatted = data?.map((activity: Activity) => {
        const formatted = formatActivityForDisplay(activity);
        // Priorité au cache local
        const cachedStatus = ActivityReadStatusCache.getReadStatus(activity.id);
        const finalIsRead = cachedStatus !== null ? cachedStatus : activity.is_read;
        
        return {
          ...formatted,
          is_read: finalIsRead
        };
      }) || [];
      
      setActivities(formatted);
      applyFiltersAndSort(formatted);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchApporteurs = async () => {
    try {
      const data = await ApporteursService.getAllApporteurs();
      setApporteurs(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des apporteurs:', error);
    }
  };

  const markActivityAsRead = (activityId: string) => {
    // Mise à jour optimiste immédiate
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    setFilteredActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    
    // Ajouter au cache pour synchronisation en arrière-plan
    ActivityReadStatusCache.markAsReadOptimistic(activityId);
  };

  const deleteActivity = async (activityId: string) => {
    try {
      await ActivitiesService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.id !== activityId));
      setFilteredActivities(prev => prev.filter(a => a.id !== activityId));
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
    }
  };

  // Fonction pour gérer le clic sur une activité
  const handleActivityClick = (activity: Activity) => {
    // Naviguer vers le dossier si disponible
    if (activity.dossier_id) {
      router.push(`/admin/dossiers/${activity.dossier_id}`);
    }
  };

  const applyFiltersAndSort = (source: Activity[] = activities) => {
    let filtered = [...source];
    
    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    
    // Filtre par apporteur
    if (filterApporteur !== 'all') {
      filtered = filtered.filter(item => item.user_id === filterApporteur);
    }
    
    // Filtre non lus
    if (showUnreadOnly) {
      filtered = filtered.filter(item => !item.is_read);
    }
    
    // Tri
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return (a.type || '').localeCompare(b.type || '');
      }
    });
    
    setFilteredActivities(filtered);
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diff < 60) return `Il y a ${diff}min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    if (diff < 2880) return 'Hier';
    return `${Math.floor(diff / 1440)} jours`;
  };

  const getItemStyles = (type: string) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-700' };
      case 'warning':
        return { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-700' };
      case 'info':
        return { bg: 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20', icon: 'text-[#335FAD] dark:text-[#335FAD]', border: 'border-[#335FAD]/20 dark:border-[#335FAD]/70' };
      case 'error':
        return { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-700' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-600' };
    }
  };

  // UseEffects
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      if (savedDarkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized && currentBrokerId) {
      fetchActivities();
      fetchApporteurs();
    }
  }, [isInitialized, currentBrokerId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [sortBy, filterType, filterApporteur, showUnreadOnly]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <AdminHeader 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        adminData={adminData}
      />
      
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white">
                Activités de la plateforme
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vue d'ensemble des activités de tous les apporteurs
              </p>
            </div>
          </div>
        </div>

        {/* Filtres et contrôles */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            {/* Tri */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Trier par:</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'type')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par type */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Type:</label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Attention</SelectItem>
                  <SelectItem value="error">Erreur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par apporteur */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Apporteur:</label>
              <Select value={filterApporteur} onValueChange={(v) => setFilterApporteur(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les apporteurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {apporteurs.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.prenom} {app.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre non lus */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unread-only"
                checked={showUnreadOnly}
                onChange={e => setShowUnreadOnly(e.target.checked)}
                className="w-4 h-4 text-[#335FAD] bg-gray-100 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="unread-only" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap">
                Non lus uniquement
              </label>
            </div>

            {/* Actualiser */}
            <button
              onClick={() => fetchActivities()}
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Actualiser
            </button>
          </div>
        </div>

        {/* Liste des activités */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] dark:border-[#335FAD]"></div>
            </div>
          ) : paginatedItems.length === 0 ? (
            <EmptyState
              icon="ri-history-line"
              title="Aucune activité"
              description={filterType !== 'all' || filterApporteur
                ? "Aucune activité ne correspond à ces filtres. Essayez de modifier vos critères."
                : "L'historique des activités est vide. Les actions de vos apporteurs apparaîtront ici."
              }
              variant="compact"
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedItems.map(item => {
                const styles = getItemStyles(item.type || 'info');
                return (
                  <div 
                    key={item.id} 
                    onClick={() => handleActivityClick(item)}
                    onMouseEnter={() => !item.is_read && markActivityAsRead(item.id)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 ${styles.bg} ${styles.border} border rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <i className={`${item.icon} ${styles.icon} text-lg`}></i>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`font-medium text-gray-900 dark:text-white ${!item.is_read ? 'font-semibold' : ''}`}>
                                {item.activity_title}
                              </h3>
                              {!item.is_read && <span className="w-2 h-2 bg-[#335FAD] rounded-full"></span>}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {item.activity_description}
                            </p>
                            
                            {/* Métadonnées */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>{item.time}</span>
                              {item.apporteur_nom && item.apporteur_prenom && (
                                <span className="px-2 py-1 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] rounded-full">
                                  {item.apporteur_prenom} {item.apporteur_nom}
                                </span>
                              )}
                              {item.numero_dossier && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                  #{item.numero_dossier}
                                </span>
                              )}
                              {item.client_nom && item.client_prenom && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                  {item.client_prenom} {item.client_nom}
                                </span>
                              )}
                              {item.amount && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                  {item.amount}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {!item.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markActivityAsRead(item.id);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#335FAD] dark:hover:text-[#335FAD] cursor-pointer"
                                title="Marquer comme lu"
                              >
                                <i className="ri-check-line text-sm"></i>
                              </button>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteActivity(item.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              title="Supprimer"
                            >
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Info pagination */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredActivities.length)} sur {filteredActivities.length} éléments
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
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
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

        {/* Stats en bas (si pas de pagination) */}
        {totalPages <= 1 && filteredActivities.length > 0 && (
          <div className="mt-6 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              {filteredActivities.length} activité{filteredActivities.length > 1 ? 's' : ''} 
              {showUnreadOnly ? ' non lue' + (filteredActivities.length > 1 ? 's' : '') : ''}
            </span>
            <span>
              {activities.filter(a => !a.is_read).length} non lue{activities.filter(a => !a.is_read).length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
