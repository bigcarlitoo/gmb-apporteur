'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { ActivitiesService } from '@/lib/services/activities';
import { ActivityReadStatusCache } from '@/lib/services/activity-read-status-cache';

interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

interface AdminHeaderProps {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  adminData: AdminData;
}

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  apporteurName?: string;
  clientName?: string;
  dossierNumber?: string;
  dossierId?: string;
}

export default function AdminHeader({ darkMode, setDarkMode, adminData }: AdminHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { brokers, currentBrokerId, selectBroker } = useBrokerContext();

  // Compter les notifications non lues
  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  // Charger les notifications filtrées depuis la DB
  useEffect(() => {
    fetchNotifications();

    // Actualisation automatique toutes les 30 secondes
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    // Écouter les changements du cache pour rafraîchir l'UI
    const unsubscribe = ActivityReadStatusCache.onSync(() => {
      // Recalculer le compteur basé sur le cache local
      setNotifications(prev => prev.map(n => {
        const cachedStatus = ActivityReadStatusCache.getReadStatus(n.id);
        return cachedStatus !== null ? { ...n, isRead: cachedStatus } : n;
      }));
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentBrokerId]); // Recharger quand le broker change

  // Fonction pour récupérer les notifications filtrées (actions des apporteurs uniquement)
  const fetchNotifications = async () => {
    try {
      if (!currentBrokerId) {
        console.log('[AdminHeader] Pas de broker sélectionné, notifications vides');
        setNotifications([]);
        return;
      }
      
      const data = await ActivitiesService.getNotificationsForAdmin(10, currentBrokerId);

      // Formater les activités en notifications et fusionner avec cache
      const formatted = data?.map((activity: any) => {
        const activityData = activity.activity_data || {};
        let type: 'success' | 'info' | 'warning' | 'error' = 'info';

        switch (activity.activity_type) {
          case 'dossier_created':
            type = 'info';
            break;
          case 'devis_accepte':
            type = 'success';
            break;
          case 'devis_refuse':
            type = 'error';
            break;
          case 'dossier_finalise':
            type = 'success';
            break;
        }

        // Fusionner avec le cache local
        const cachedStatus = ActivityReadStatusCache.getReadStatus(activity.id);
        const finalIsRead = cachedStatus !== null ? cachedStatus : (activity.is_read || false);

        return {
          id: activity.id,
          type,
          title: activity.activity_title,
          description: activity.activity_description,
          time: formatTimeAgo(activity.created_at),
          isRead: finalIsRead,
          apporteurName: activity.apporteur_nom && activity.apporteur_prenom
            ? `${activity.apporteur_prenom} ${activity.apporteur_nom}`
            : undefined,
          clientName: activity.client_nom && activity.client_prenom
            ? `${activity.client_prenom} ${activity.client_nom}`
            : undefined,
          dossierNumber: activity.numero_dossier,
          dossierId: activity.dossier_id
        };
      }) || [];

      setNotifications(formatted);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  // Fonction pour gérer le clic sur une notification
  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    await markAsRead(notification.id);
    // Fermer le panneau
    setShowNotificationsMenu(false);
    // Naviguer vers le dossier si disponible
    if (notification.dossierId) {
      window.location.href = `/admin/dossiers/${notification.dossierId}`;
    }
  };

  // Fonction pour marquer une notification comme lue (optimiste)
  const markAsRead = (notificationId: string) => {
    // Mise à jour optimiste immédiate
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    ));

    // Ajouter au cache pour synchronisation en arrière-plan
    ActivityReadStatusCache.markAsReadOptimistic(notificationId);
  };

  // Fonction pour formater le temps écoulé
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diff < 60) return `Il y a ${diff}min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    if (diff < 2880) return 'Hier';
    return `${Math.floor(diff / 1440)} jours`;
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-100/95 backdrop-blur-md shadow-lg border-b border-gray-200 transition-colors duration-300 dark:bg-gray-900/80 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
          <nav className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/admin" className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105">
              <Image
                className="h-10 w-auto drop-shadow-sm transition-all"
                src="/assets/svgs/gmb-courtagegrand.svg"
                alt="GMB Courtage logo"
                width={175}
                height={34}
                style={{
                  filter: darkMode ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(8%) sepia(40%) saturate(6266%) hue-rotate(223deg) brightness(95%) contrast(98%)'
                }}
              />
              <div className="hidden sm:block">
                <p className="text-[11px] text-gray-600 dark:text-gray-400 -mt-1">Espace Admin</p>
              </div>
            </Link>

            {/* Navigation Desktop */}
            <div className="hidden xl:flex items-center space-x-4">
              <Link
                href="/admin"
                className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${pathname === '/admin' ? 'text-[#335FAD] dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-600 dark:text-white hover:text-black dark:hover:text-white'
                  }`}
              >
                Accueil
              </Link>

              {/* Broker Selector (Feature 1) */}
              {brokers.length > 1 && (
                <div className="relative">
                  <select
                    value={currentBrokerId || ''}
                    onChange={(e) => selectBroker(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#335FAD] focus:border-[#335FAD] block w-full px-3 py-2.5 pr-8 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    style={{ minWidth: '150px' }}
                  >
                    {brokers.map((broker) => (
                      <option key={broker.id} value={broker.id}>
                        {broker.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <i className="ri-arrow-down-s-line text-xs"></i>
                  </div>
                </div>
              )}

              <Link
                href="/admin/dossiers"
                className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${pathname.startsWith('/admin/dossiers') ? 'text-[#335FAD] dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-600 dark:text-white hover:text-black dark:hover:text-white'
                  }`}
              >
                Gestion des dossiers
              </Link>
              <Link
                href="/admin/apporteurs"
                className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 ${pathname.startsWith('/admin/apporteurs') ? 'text-[#335FAD] dark:text-white bg-gray-100 dark:bg-gray-700' : 'text-gray-600 dark:text-white hover:text-black dark:hover:text-white'
                  }`}
              >
                Apporteurs
              </Link>
              {/* Notifications */}
              <div className="relative group" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                  className="relative w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-notification-line text-gray-700 dark:text-gray-300"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <div className="absolute right-0 mt-4 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="relative pt-2">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl py-2 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h3>
                          <button className="text-xs text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer">
                            Tout marquer comme lu
                          </button>
                        </div>
                      </div>

                      <div className="py-2">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const getNotificationStyles = () => {
                              switch (notification.type) {
                                case 'success':
                                  return { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'ri-checkbox-circle-line text-green-600 dark:text-green-400' };
                                case 'error':
                                  return { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'ri-close-circle-line text-red-600 dark:text-red-400' };
                                case 'warning':
                                  return { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'ri-alert-line text-amber-600 dark:text-amber-400' };
                                default:
                                  return { bg: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30', icon: 'ri-information-line text-[#335FAD] dark:text-[#335FAD]' };
                              }
                            };
                            const styles = getNotificationStyles();

                            return (
                              <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                onMouseEnter={() => !notification.isRead && markAsRead(notification.id)}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className={`w-8 h-8 ${styles.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <i className={`${styles.icon} text-sm`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {notification.description}
                                      {notification.apporteurName && ` - ${notification.apporteurName}`}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                                  </div>
                                  {!notification.isRead && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <Link href="/admin/activites?tab=notifications" className="block w-full text-center text-sm text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer" onClick={() => setShowNotificationsMenu(false)}>
                          Voir toutes les notifications
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profil desktop */}
              <div className="relative hidden xl:block group" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 bg-[#335FAD] rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{adminData.initials}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{adminData.firstName} {adminData.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{adminData.role}</p>
                  </div>
                </button>
                <div className="absolute right-0 mt-4 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="relative pt-2">
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl py-2">
                      <Link 
                        href="/admin/statistiques" 
                        className={`flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          pathname.startsWith('/admin/statistiques') 
                            ? 'text-[#335FAD] bg-gray-50 dark:bg-gray-700' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <i className="ri-bar-chart-box-line mr-3 text-gray-500 dark:text-gray-400 text-sm"></i>
                        Statistiques
                      </Link>
                      <Link 
                        href="/admin/billing" 
                        className={`flex items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
                          pathname.startsWith('/admin/billing') 
                            ? 'text-[#335FAD] bg-gray-50 dark:bg-gray-700' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <i className="ri-bank-card-line mr-3 text-gray-500 dark:text-gray-400 text-sm"></i>
                        Paiements
                      </Link>
                      <Link href="/admin/profil" className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 cursor-pointer">
                        <i className="ri-user-line mr-3 text-gray-500 dark:text-gray-400 text-sm"></i>
                        Profil et paramètres
                      </Link>
                      <button className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                        <i className="ri-logout-box-line mr-3 text-sm"></i>
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle dark mode */}
              <button
                onClick={handleDarkModeToggle}
                className="hidden md:flex w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg items-center justify-center transition-colors cursor-pointer"
                title={darkMode ? 'Mode clair' : 'Mode sombre'}
              >
                <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-700 dark:text-gray-300`}></i>
              </button>
            </div>

            {/* Mobile */}
            <div className="xl:hidden flex items-center space-x-2">
              {/* Bouton Notifications Mobile */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                  className="relative w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-200 active:scale-95"
                  aria-label="Notifications"
                >
                  <i className="ri-notification-line text-lg"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Bouton Burger */}
              <div>
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="relative w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-200 active:scale-95"
                  aria-label="Toggle menu"
                >
                  <div className="w-5 h-5 relative">
                    <span className={`absolute left-0 block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${showMobileMenu ? 'rotate-45 top-2' : 'top-0.5'}`}></span>
                    <span className={`absolute left-0 block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${showMobileMenu ? 'opacity-0' : 'top-2'}`}></span>
                    <span className={`absolute left-0 block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${showMobileMenu ? '-rotate-45 top-2' : 'top-3.5'}`}></span>
                  </div>
                </button>
              </div>

              {showMobileMenu && (
                <div className="fixed inset-0 top-16 lg:top-20 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
                  <div ref={menuRef} className="mx-4 pt-2 pb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                      <div className="grid grid-cols-1 gap-2 p-4">
                        <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/admin' ? 'bg-[#335FAD] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-dashboard-line"></i>Accueil</Link>
                        <Link href="/admin/dossiers" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/dossiers') ? 'bg-[#335FAD] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-folder-line"></i>Gestion des dossiers</Link>
                        <Link href="/admin/apporteurs" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/apporteurs') ? 'bg-[#335FAD] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-team-line"></i>Apporteurs</Link>
                        <Link href="/admin/statistiques" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/statistiques') ? 'bg-[#335FAD] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-line-chart-line"></i>Statistiques</Link>
                        <Link href="/admin/billing" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/billing') ? 'bg-[#335FAD] text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-wallet-3-line"></i>Paiements</Link>

                        {/* Profil (parité avec burger apporteur) */}
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-3 mb-3 px-4">
                            <div className="w-10 h-10 bg-[#335FAD] rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-medium">{adminData.initials}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{adminData.firstName} {adminData.lastName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{adminData.role}</p>
                            </div>
                          </div>
                          <div className="space-y-2 px-4 pb-2">
                            <Link href="/admin/profil" className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                              <i className="ri-user-settings-line"></i>
                              Profil & paramètres
                            </Link>
                            <button className="flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg w-full" onClick={() => setShowMobileMenu(false)}>
                              <i className="ri-logout-box-line"></i>
                              Déconnexion
                            </button>
                          </div>
                        </div>

                        <button onClick={() => { setShowMobileMenu(false); handleDarkModeToggle(); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-colors text-left">
                          <i className={`ri-${darkMode ? 'sun' : 'moon'}-line`}></i>
                          <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showNotificationsMenu && (
                <div className="fixed inset-0 top-16 lg:top-20 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setShowNotificationsMenu(false)}>
                  <div className="mx-4 pt-2 pb-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h3>
                          <button className="text-xs text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer">
                            Tout marquer comme lu
                          </button>
                        </div>
                      </div>

                      <div className="py-2 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune notification</p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const getNotificationStyles = () => {
                              switch (notification.type) {
                                case 'success':
                                  return { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'ri-checkbox-circle-line text-green-600 dark:text-green-400' };
                                case 'error':
                                  return { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'ri-close-circle-line text-red-600 dark:text-red-400' };
                                case 'warning':
                                  return { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'ri-alert-line text-amber-600 dark:text-amber-400' };
                                default:
                                  return { bg: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30', icon: 'ri-information-line text-[#335FAD] dark:text-[#335FAD]' };
                              }
                            };
                            const styles = getNotificationStyles();

                            return (
                              <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                onMouseEnter={() => !notification.isRead && markAsRead(notification.id)}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className={`w-8 h-8 ${styles.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <i className={`${styles.icon} text-sm`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {notification.description}
                                      {notification.apporteurName && ` - ${notification.apporteurName}`}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                                  </div>
                                  {!notification.isRead && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <Link href="/admin/activites?tab=notifications" className="block w-full text-center text-sm text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer" onClick={() => setShowNotificationsMenu(false)}>
                          Voir toutes les notifications
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <div className="h-16 lg:h-20" aria-hidden></div>
    </>
  );
}