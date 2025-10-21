
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ApporteurHeader from '../components/ApporteurHeader';
import AdminHeader from '../components/AdminHeader';

export default function NotFound() {
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();

  // Déterminer si c'est un utilisateur admin ou apporteur basé sur l'URL
  const isAdmin = pathname?.startsWith('/admin');

  // Données mock pour les utilisateurs
  const apporteurData = {
    id: 'mock-apporteur-id',
    firstName: 'Jean',
    lastName: 'Dupont',
    initials: 'JD',
    role: 'Apporteur'
  };

  const adminData = {
    id: 'mock-admin-id',
    firstName: 'Marie',
    lastName: 'Martin',
    initials: 'MM',
    role: 'Administrateur'
  };

  // Détection du mode sombre
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
    
    // Appliquer le mode sombre au document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header adaptatif */}
      {isAdmin ? (
        <AdminHeader 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          adminData={adminData}
        />
      ) : (
        <ApporteurHeader 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          userData={apporteurData}
        />
      )}

      {/* Contenu 404 */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg w-full text-center">
          {/* Illustration d'erreur */}
          <div className="mb-8">
            <div className="relative mx-auto w-64 h-64 mb-8">
              {/* Image générée par Stable Diffusion pour illustration 404 */}
              <img 
                src="https://readdy.ai/api/search-image?query=Modern%20minimalist%20illustration%20of%20a%20confused%20person%20looking%20at%20a%20map%20or%20searching%20with%20magnifying%20glass%2C%20clean%20geometric%20shapes%2C%20soft%20blue%20and%20gray%20color%20palette%2C%20professional%20business%20style%2C%20simple%20background%20with%20subtle%20gradients&width=400&height=400&seq=404error&orientation=squarish"
                alt="Page non trouvée"
                className="w-full h-full object-cover rounded-2xl shadow-lg"
              />
              
              {/* Badge 404 superposé */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transform rotate-12">
                <span className="text-2xl font-bold">404</span>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="space-y-6">
            {/* Titre principal */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                Oops !
              </h1>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300">
                Page non trouvée
              </h2>
            </div>

            {/* Message d'erreur */}
            <div className="space-y-4">
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                La page que vous recherchez n'existe pas ou vous n'avez pas les autorisations nécessaires pour y accéder.
              </p>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-information-line text-amber-600 dark:text-amber-400"></i>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      Causes possibles
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• L'URL a été mal saisie ou est obsolète</li>
                      <li>• Vous n'avez pas les droits d'accès requis</li>
                      <li>• La page a été déplacée ou supprimée</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <i className="ri-handshake-line text-[#335FAD] dark:text-[#335FAD]/80 text-xs"></i>
              </div>
              <span className="font-['Pacifico'] text-[#335FAD] dark:text-[#335FAD]/80">GMB Courtage</span>
              <span>•</span>
              <span>{isAdmin ? 'Espace Admin' : 'Espace Apporteur'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
