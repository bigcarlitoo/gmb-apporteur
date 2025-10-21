
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

// Interface pour les données utilisateur
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les notifications depuis Supabase
interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  description: string;
  amount?: string;
  time: string;
  isRead: boolean;
}

interface ApporteurHeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  userData: UserData;
}

export default function ApporteurHeader({ darkMode, setDarkMode, userData }: ApporteurHeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // TODO: SUPABASE - Remplacer par les vraies notifications depuis la base de données
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Dossier validé ✅',
      description: 'Client: Jean Dupont - Auto',
      amount: 'Commission: €180',
      time: 'Il y a 1h',
      isRead: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Nouveau classement 📊',
      description: 'Vous êtes 3ème ce mois-ci',
      time: 'Il y a 2 heures',
      isRead: false
    }
  ]);

  // TODO: SUPABASE INTEGRATION FUNCTIONS
  // Fonction pour récupérer les notifications
  const fetchNotifications = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('notifications')
      //   .select('*')
      //   .eq('user_id', userData.id)
      //   .order('created_at', { ascending: false })
      //   .limit(10);
      // 
      // if (error) throw error;
      // setNotifications(data);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  // Fonction pour marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ is_read: true })
      //   .eq('id', notificationId);
      // 
      // if (error) throw error;
      // fetchNotifications(); // Recharger les notifications
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error);
    }
  };

  // Fonction pour déterminer si un lien est actif
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Compter les notifications non lues
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-100/95 backdrop-blur-md shadow-lg border-b border-gray-200 transition-colors duration-300 dark:bg-gray-900/80 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-50">
        <nav className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105">
            <Image
              className="h-10 w-auto drop-shadow-sm"
              src="/assets/svgs/gmb-courtagegrand.svg"
              alt="GMB Courtage logo"
              width={175}
              height={34}
              style={{ 
                filter: 'brightness(0) saturate(100%) invert(8%) sepia(40%) saturate(6266%) hue-rotate(223deg) brightness(95%) contrast(98%)'
              }}
            />
            <div className="hidden sm:block">
              <p className="text-[11px] text-gray-600 dark:text-gray-400 -mt-1">Espace Apporteur</p>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link 
              href="/" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                isActiveLink('/') ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Accueil
            </Link>
            <Link 
              href="/mes-dossiers" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                isActiveLink('/mes-dossiers') ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Mes Dossiers
            </Link>

            {/* Notifications */}
            <div className="relative group" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ri-notification-line text-gray-700 dark:text-gray-300"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border border-white dark:border-gray-800">
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
                  
                  {/* TODO: SUPABASE - Remplacer par les vraies notifications apporteur */}
                  <div className="py-2">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'success' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : notification.type === 'warning'
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30'
                          }`}>
                            <i className={`${
                              notification.type === 'success' 
                                ? 'ri-checkbox-circle-line text-green-600 dark:text-green-400' 
                                : notification.type === 'warning'
                                ? 'ri-alert-line text-amber-600 dark:text-amber-400'
                                : 'ri-information-line text-[#335FAD] dark:text-[#335FAD]'
                            } text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{notification.description}</p>
                        {notification.amount && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{notification.amount}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                          </div>
                          {!notification.isRead && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <Link href="/activites?tab=notifications" className="block w-full text-center text-sm text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer" onClick={() => setShowNotifications(false)}>
                        Voir toutes les notifications
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile - Desktop */}
            <div className="relative hidden xl:block group">
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-200 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-[#335FAD] rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{userData.initials}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{userData.firstName} {userData.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userData.role}</p>
                </div>
              </button>
              <div className="absolute right-0 mt-4 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="relative pt-2">
                  <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl py-2">
                    <Link href="/profil" className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700">
                      <i className="ri-user-line mr-3 text-gray-500 dark:text-gray-400 text-sm"></i>
                      Profil et paramètres
                    </Link>
                    <div className="flex items-center px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500 border-b border-gray-50 dark:border-gray-700 cursor-not-allowed relative group">
                      <i className="ri-wallet-line mr-3 text-gray-400 dark:text-gray-500 text-sm"></i>
                      Mes Gains
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Bientôt disponible
                      </div>
                    </div>
                    <Link href="#" className="flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <i className="ri-logout-box-line mr-3 text-sm"></i>
                      Déconnexion
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle dark mode (à droite comme Admin) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden md:flex w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg items-center justify-center transition-colors cursor-pointer"
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-700 dark:text-gray-300`}></i>
            </button>
          </div>

          {/* Menu Mobile */}
          <div className="lg:hidden flex items-center space-x-2">
            {/* Bouton Notifications Mobile */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 text-gray-700 dark:text-gray-200 hover:text-black rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-200 active:scale-95"
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
            <div ref={menuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="relative p-2.5 text-gray-700 dark:text-gray-200 hover:text-black rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-200 active:scale-95"
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
              <div className="absolute top-full right-0 w-screen mt-2 pb-4">
                <div className="relative mx-4">
                  <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 gap-2 p-4">
              <Link 
                href="/" 
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActiveLink('/') ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <i className="ri-dashboard-line text-lg"></i>
                        <span>Accueil</span>
              </Link>
              <Link 
                href="/mes-dossiers" 
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActiveLink('/mes-dossiers') ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`}
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <i className="ri-folder-line text-lg"></i>
                        <span>Mes Dossiers</span>
              </Link>
              
              <button 
                        onClick={() => { setDarkMode(!darkMode); setShowMobileMenu(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                        <i className={`ri-${darkMode ? 'sun' : 'moon'}-line text-lg`}></i>
                        <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 mb-3 px-4">
                          <div className="w-10 h-10 bg-[#335FAD] rounded-lg flex items-center justify-center">
                            <span className="text-white font-medium text-sm">{userData.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{userData.firstName} {userData.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{userData.role}</p>
                  </div>
                </div>
                        <div className="space-y-2 px-4 pb-2">
                          <Link href="/profil" className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-user-line"></i>
                    Mon Profil
                  </Link>
                          <Link href="#" className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-wallet-line"></i>
                    Mes Gains
                  </Link>
                          <Link href="#" className="flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-logout-box-line"></i>
                    Déconnexion
                  </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showNotifications && (
              <div className="absolute top-full right-0 w-screen mt-2 pb-4">
                <div className="relative mx-4">
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
                      {notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.type === 'success' 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : notification.type === 'warning'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30'
                            }`}>
                              <i className={`${
                                notification.type === 'success' 
                                  ? 'ri-checkbox-circle-line text-green-600 dark:text-green-400' 
                                  : notification.type === 'warning'
                                  ? 'ri-alert-line text-amber-600 dark:text-amber-400'
                                  : 'ri-information-line text-[#335FAD] dark:text-[#335FAD]'
                              } text-sm`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{notification.description}</p>
                              {notification.amount && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">{notification.amount}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                            </div>
                            {!notification.isRead && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <Link href="/activites?tab=notifications" className="block w-full text-center text-sm text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 cursor-pointer" onClick={() => setShowNotifications(false)}>
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
