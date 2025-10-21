'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

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

export default function AdminHeader({ darkMode, setDarkMode, adminData }: AdminHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowUserMenu(false);
      setShowMobileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotificationsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              <p className="text-[11px] text-gray-600 dark:text-gray-400 -mt-1">Espace Admin</p>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link 
              href="/admin" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                pathname === '/admin' ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Accueil
            </Link>
            <Link 
              href="/admin/dossiers" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                pathname.startsWith('/admin/dossiers') ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Gestion des dossiers
            </Link>
            <Link 
              href="/admin/apporteurs" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                pathname.startsWith('/admin/apporteurs') ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Apporteurs
            </Link>
            <Link 
              href="/admin/statistiques" 
              className={`relative px-5 py-2.5 text-sm lg:text-base font-medium transition-colors rounded-lg hover:bg-gray-200 ${
                pathname.startsWith('/admin/statistiques') ? 'text-[#335FAD] bg-gray-100' : 'text-gray-600 hover:text-black'
              }`}
            >
              Statistiques
            </Link>

            {/* Notifications */}
            <div className="relative group" ref={notificationsRef}>
            <button
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className="relative w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ri-notification-line text-gray-700 dark:text-gray-300"></i>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
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
                  
                  {/* TODO: SUPABASE - Remplacer par les vraies notifications admin */}
                  <div className="py-2">
                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Nouveau dossier validé</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Dossier #2847 - Famille Martin</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Il y a 2h</p>
                        </div>
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-user-add-line text-[#335FAD] dark:text-[#335FAD] text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Nouvel apporteur inscrit</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sophie Laurent</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Il y a 4h</p>
                        </div>
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      </div>
                    </div>
                    
                    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="ri-alert-line text-amber-600 dark:text-amber-400 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Document manquant</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Dossier #2851 - Justificatif revenus</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hier</p>
                        </div>
                      </div>
                    </div>
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
                className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-200 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
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
                    <Link href="/admin/profil" className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700 cursor-pointer">
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
          <div className="lg:hidden flex items-center space-x-2">
            {/* Bouton Notifications Mobile */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                className="relative p-2.5 text-gray-700 dark:text-gray-200 hover:text-black rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-200 active:scale-95"
                aria-label="Notifications"
              >
                <i className="ri-notification-line text-lg"></i>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
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
                      <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname === '/admin' ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-dashboard-line"></i>Accueil</Link>
                      <Link href="/admin/dossiers" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/dossiers') ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-folder-line"></i>Gestion des dossiers</Link>
                      <Link href="/admin/apporteurs" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/apporteurs') ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-team-line"></i>Apporteurs</Link>
                      <Link href="/admin/stats" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${pathname.startsWith('/admin/stats') ? 'bg-gray-100 text-[#335FAD]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 hover:text-black'}`} onClick={() => setShowMobileMenu(false)}><i className="ri-line-chart-line"></i>Statistiques</Link>

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
                          <Link href="/admin/profil" className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-user-line"></i>
                            Mon profil
                          </Link>
                          <Link href="/admin/parametres" className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-black hover:bg-gray-50 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-settings-line"></i>
                            Paramètres
                          </Link>
                          <button className="flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg" onClick={() => setShowMobileMenu(false)}>
                            <i className="ri-logout-box-line"></i>
                            Déconnexion
                          </button>
                        </div>
                      </div>

                      <button onClick={() => { setShowMobileMenu(false); handleDarkModeToggle(); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors text-left">
                        <i className={`ri-${darkMode ? 'sun' : 'moon'}-line`}></i>
                        <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showNotificationsMenu && (
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
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Nouveau dossier validé</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Dossier #2847 - Famille Martin</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Il y a 2h</p>
                          </div>
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        </div>
                      </div>
                      
                      <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-add-line text-[#335FAD] dark:text-[#335FAD] text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Nouvel apporteur inscrit</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sophie Laurent</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Il y a 4h</p>
                          </div>
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        </div>
                      </div>
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