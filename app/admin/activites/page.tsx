'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

// Interfaces pour les activités admin
interface AdminActivity {
  id: string;
  type: 'nouveau_dossier' | 'validation_devis' | 'refus_devis' | 'finalisation' | 'nouveau_apporteur' | 'modification_dossier';
  title: string;
  description: string;
  amount?: string;
  status?: string;
  icon: string;
  created_at: string;
  apporteur_name?: string;
  client_name?: string;
  dossier_number?: string;
  is_read: boolean;
}

interface AdminNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string;
  amount?: string;
  icon: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminActivitesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'activities' | 'notifications'>('activities');
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // États pour les activités et notifications
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<AdminActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  
  // États pour les filtres
  const [sortBy, setSortBy] = useState<'date' | 'type'>('date');
  const [filterType, setFilterType] = useState<'all' | 'nouveau_dossier' | 'validation_devis' | 'refus_devis' | 'finalisation' | 'nouveau_apporteur' | 'modification_dossier'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data pour admin
  const mockActivities: AdminActivity[] = [
    {
      id: '1',
      type: 'nouveau_dossier',
      title: 'Nouveau dossier soumis',
      description: 'Dossier #2847 - Famille Martin',
      icon: 'ri-file-add-line',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      apporteur_name: 'Marie Dubois',
      client_name: 'Famille Martin',
      dossier_number: '2847',
      is_read: false
    },
    {
      id: '2',
      type: 'validation_devis',
      title: 'Devis validé',
      description: 'Dossier #2851 - Couple Dubois',
      amount: 'Économie : 4 250 €',
      icon: 'ri-check-double-line',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      apporteur_name: 'Thomas Lambert',
      client_name: 'Couple Dubois',
      dossier_number: '2851',
      is_read: true
    },
    {
      id: '3',
      type: 'nouveau_apporteur',
      title: 'Nouvel apporteur inscrit',
      description: 'Sophie Laurent a rejoint la plateforme',
      icon: 'ri-user-add-line',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      apporteur_name: 'Sophie Laurent',
      is_read: false
    },
    {
      id: '4',
      type: 'finalisation',
      title: 'Dossier finalisé',
      description: 'Dossier #2840 - M. et Mme Petit',
      amount: 'Commission : 3 150 €',
      icon: 'ri-award-line',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      apporteur_name: 'Emma Roux',
      client_name: 'M. et Mme Petit',
      dossier_number: '2840',
      is_read: true
    }
  ];

  const mockNotifications: AdminNotification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Dossier validé ✅',
      description: 'Client: Famille Martin - Prêt immobilier',
      amount: 'Commission: €450',
      icon: 'ri-checkbox-circle-line',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      is_read: false,
      action_url: '/admin/dossiers/2847'
    },
    {
      id: '2',
      type: 'info',
      title: 'Nouveau classement 📊',
      description: 'Marie Dubois est 3ème ce mois-ci',
      icon: 'ri-trophy-line',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Action requise',
      description: 'Document manquant - Dossier #2851',
      icon: 'ri-alert-line',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      action_url: '/admin/dossiers/2851'
    }
  ];

  // Données paginées
  const currentItems = activeTab === 'activities' ? filteredActivities : filteredNotifications;
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  // Réinitialiser la page quand on change d'onglet ou de filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortBy, filterType, showUnreadOnly]);

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

  // Fonctions existantes
  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      // TODO: SUPABASE - Remplacer par les vraies activités admin
      setActivities(mockActivities);
      setFilteredActivities(mockActivities);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      // TODO: SUPABASE - Remplacer par les vraies notifications admin
      setNotifications(mockNotifications);
      setFilteredNotifications(mockNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markActivityAsRead = async (activityId: string) => {
    try {
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
      setFilteredActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_read: true } : a));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'activité:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setFilteredNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la notification:", error);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      setActivities(prev => prev.filter(a => a.id !== activityId));
      setFilteredActivities(prev => prev.filter(a => a.id !== activityId));
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setFilteredNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
    }
  };

  const applyFiltersAndSort = () => {
    const source = activeTab === 'activities' ? activities : notifications;
    let filtered = [...source];
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }
    if (showUnreadOnly) {
      filtered = filtered.filter(item => !item.is_read);
    }
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return a.type.localeCompare(b.type);
      }
    });
    if (activeTab === 'activities') setFilteredActivities(filtered);
    else setFilteredNotifications(filtered);
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
      case 'nouveau_dossier':
        return { bg: 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20', icon: 'text-[#335FAD] dark:text-[#335FAD]', border: 'border-[#335FAD]/20 dark:border-[#335FAD]/70' };
      case 'validation_devis':
        return { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-700' };
      case 'refus_devis':
        return { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-700' };
      case 'finalisation':
        return { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-700' };
      case 'nouveau_apporteur':
        return { bg: 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20', icon: 'text-[#335FAD] dark:text-[#335FAD]', border: 'border-[#335FAD]/20 dark:border-[#335FAD]/70' };
      case 'modification_dossier':
        return { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-700' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-600' };
    }
  };

  // Mock admin data
  const adminData = {
    id: 'admin1',
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
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
    if (isInitialized) {
      fetchActivities();
      fetchNotifications();
      // Lire le paramètre d'onglet si présent
      const url = new URL(window.location.href);
      const tab = url.searchParams.get('tab');
      if (tab === 'notifications') setActiveTab('notifications');
      if (tab === 'activities') setActiveTab('activities');
    }
  }, [isInitialized]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [activities, notifications, activeTab, sortBy, filterType, showUnreadOnly]);

  const isLoading = activeTab === 'activities' ? activitiesLoading : notificationsLoading;

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
                Activités & Notifications Admin
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gérez les activités et notifications de la plateforme
              </p>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mb-8">
          <div className="relative">
            {/* Version Desktop */}
            <div className="hidden sm:flex items-center justify-center">
              <div className="relative bg-gray-100 dark:bg-gray-700 p-1.5 rounded-2xl shadow-inner">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap min-w-[140px] ${
                      activeTab === 'activities'
                        ? 'bg-white dark:bg-gray-600 text-[#335FAD] dark:text-[#335FAD] shadow-md transform scale-[1.02]'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <i className="ri-activity-line text-lg"></i>
                      <span>Activités</span>
                      {activities.filter(a => !a.is_read).length > 0 && (
                        <span className="ml-2 w-5 h-5 bg-[#335FAD] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {activities.filter(a => !a.is_read).length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap min-w-[140px] ${
                      activeTab === 'notifications'
                        ? 'bg-white dark:bg-gray-600 text-[#335FAD] dark:text-[#335FAD] shadow-md transform scale-[1.02]'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <i className="ri-notification-3-line text-lg"></i>
                      <span>Notifications</span>
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <span className="ml-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                          {notifications.filter(n => !n.is_read).length}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Version Mobile */}
            <div className="sm:hidden">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`relative py-4 px-4 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                      activeTab === 'activities'
                        ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border-2 border-[#335FAD]/20 dark:border-[#335FAD]/70 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 border-2 border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative">
                        <i className="ri-activity-line text-2xl"></i>
                        {activities.filter(a => !a.is_read).length > 0 && (
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#335FAD] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {activities.filter(a => !a.is_read).length}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">Activités</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`relative py-4 px-4 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                      activeTab === 'notifications'
                        ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border-2 border-[#335FAD]/20 dark:border-[#335FAD]/70 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 border-2 border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative">
                        <i className="ri-notification-3-line text-2xl"></i>
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse">
                            {notifications.filter(n => !n.is_read).length}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">Notifications</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et contrôles */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
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
                  <SelectItem value="nouveau_dossier">Nouveaux dossiers</SelectItem>
                  <SelectItem value="validation_devis">Devis validés</SelectItem>
                  <SelectItem value="refus_devis">Devis refusés</SelectItem>
                  <SelectItem value="finalisation">Finalisations</SelectItem>
                  <SelectItem value="nouveau_apporteur">Nouveaux apporteurs</SelectItem>
                  <SelectItem value="modification_dossier">Modifications</SelectItem>
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
              onClick={() => {
                if (activeTab === 'activities') fetchActivities();
                else fetchNotifications();
              }}
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Actualiser
            </button>
          </div>
        </div>

        {/* Liste des éléments */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] dark:border-[#335FAD]"></div>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-12">
              <i className={`${activeTab === 'activities' ? 'ri-activity-line' : 'ri-notification-3-line'} text-4xl text-gray-400 dark:text-gray-500 mb-4`}></i>
              <p className="text-gray-500 dark:text-gray-400">
                Aucun{activeTab === 'activities' ? 'e activité' : 'e notification'} trouvé{activeTab === 'activities' ? 'e' : 'e'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedItems.map(item => {
                const styles = getItemStyles(item.type);
                const isActivity = 'apporteur_name' in item;
                return (
                  <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                                {item.title}
                              </h3>
                              {!item.is_read && <span className="w-2 h-2 bg-[#335FAD] rounded-full"></span>}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {item.description}
                            </p>
                            
                            {/* Métadonnées */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatTimeAgo(item.created_at)}</span>
                              {isActivity && (item as AdminActivity).dossier_number && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                  #{(item as AdminActivity).dossier_number}
                                </span>
                              )}
                              {isActivity && (item as AdminActivity).apporteur_name && (
                                <span className="px-2 py-1 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] rounded-full">
                                  {(item as AdminActivity).apporteur_name}
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
                                onClick={() => {
                                  if (activeTab === 'activities') markActivityAsRead(item.id);
                                  else markNotificationAsRead(item.id);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#335FAD] dark:hover:text-[#335FAD] cursor-pointer"
                                title="Marquer comme lu"
                              >
                                <i className="ri-check-line text-sm"></i>
                              </button>
                            )}
                            
                            {activeTab === 'notifications' && (item as AdminNotification).action_url && (
                              <button
                                onClick={() => router.push((item as AdminNotification).action_url!)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#335FAD] dark:hover:text-[#335FAD] cursor-pointer"
                                title="Voir détails"
                              >
                                <i className="ri-external-link-line text-sm"></i>
                              </button>
                            )}
                            
                            {isActivity && (item as AdminActivity).dossier_number && (
                              <button
                                onClick={() => router.push(`/admin/dossiers/${(item as AdminActivity).dossier_number}`)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#335FAD] dark:hover:text-[#335FAD] cursor-pointer"
                                title="Voir dossier"
                              >
                                <i className="ri-external-link-line text-sm"></i>
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                if (activeTab === 'activities') deleteActivity(item.id);
                                else deleteNotification(item.id);
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
              Affichage de {startIndex + 1} à {Math.min(endIndex, currentItems.length)} sur {currentItems.length} éléments
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
        {totalPages <= 1 && (
          <div className="mt-6 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              {currentItems.length} {activeTab === 'activities' ? 'activité' : 'notification'}{currentItems.length > 1 ? 's' : ''} 
              {showUnreadOnly ? ' non lue' + (currentItems.length > 1 ? 's' : '') : ''}
            </span>
            {activeTab === 'activities' && (
              <span>
                {activities.filter(a => !a.is_read).length} non lue{activities.filter(a => !a.is_read).length > 1 ? 's' : ''}
              </span>
            )}
            {activeTab === 'notifications' && (
              <span>
                {notifications.filter(n => !n.is_read).length} non lue{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}