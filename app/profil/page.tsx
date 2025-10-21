
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ApporteurHeader from '../../components/ApporteurHeader';
import ProfileInfo from './ProfileInfo';
import NotificationSettings from './NotificationSettings';
import ResourcesSection from './ResourcesSection';

// TODO: SUPABASE INTEGRATION
// Interface pour les données utilisateur depuis Supabase
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  companyName?: string;
  email: string;
  phone: string;
}

// Interface pour les préférences de notification
interface NotificationPreferences {
  devisAvailable: {
    email: boolean;
    app: boolean;
  };
  dossierFinalized: {
    email: boolean;
    app: boolean;
  };
  rankingChanged: {
    email: boolean;
    app: boolean;
  };
  newsUpdates: {
    email: boolean;
    app: boolean;
  };
}

export default function ProfilPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'resources'>('profile');

  // TODO: SUPABASE - Remplacer par les données réelles de l'utilisateur connecté
  const [userData, setUserData] = useState<UserData>({
    id: '1',
    firstName: 'Marie',
    lastName: 'Dubois',
    initials: 'MD',
    role: 'Apporteur Premium',
    companyName: 'Dubois Conseils',
    email: 'marie.dubois@email.com',
    phone: '06 12 34 56 78'
  });

  // TODO: SUPABASE - Remplacer par les préférences réelles depuis la base de données
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    devisAvailable: { email: true, app: true },
    dossierFinalized: { email: true, app: true },
    rankingChanged: { email: false, app: true },
    newsUpdates: { email: false, app: false }
  });

  // TODO: SUPABASE INTEGRATION FUNCTIONS
  // Fonction pour récupérer les données utilisateur
  const fetchUserData = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('apporteur_profiles')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .single();
      // 
      // if (error) throw error;
      // setUserData({
      //   id: data.user_id,
      //   firstName: data.prenom,
      //   lastName: data.nom,
      //   initials: `${data.prenom[0]}${data.nom[0]}`,
      //   role: data.role || 'Apporteur',
      //   companyName: data.company_name,
      //   email: data.email,
      //   phone: data.phone
      // });
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
  };

  // Fonction pour récupérer les préférences de notification
  const fetchNotificationPreferences = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('notification_preferences')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .single();
      // 
      // if (error) throw error;
      // setNotificationPreferences(data);
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
    }
  };

  // Fonction pour sauvegarder les données utilisateur
  const saveUserData = async (updatedData: Partial<UserData>) => {
    try {
      // const { error } = await supabase
      //   .from('apporteur_profiles')
      //   .update({
      //     company_name: updatedData.companyName,
      //     email: updatedData.email,
      //     phone: updatedData.phone,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('user_id', userData.id);
      // 
      // if (error) throw error;
      
      // Mettre à jour l'état local
      setUserData(prev => ({ ...prev, ...updatedData }));
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error.message };
    }
  };

  // Fonction pour sauvegarder les préférences de notification
  const saveNotificationPreferences = async (preferences: NotificationPreferences) => {
    try {
      // const { error } = await supabase
      //   .from('notification_preferences')
      //   .upsert({
      //     user_id: userData.id,
      //     devis_available_email: preferences.devisAvailable.email,
      //     devis_available_app: preferences.devisAvailable.app,
      //     dossier_finalized_email: preferences.dossierFinalized.email,
      //     dossier_finalized_app: preferences.dossierFinalized.app,
      //     ranking_changed_email: preferences.rankingChanged.email,
      //     ranking_changed_app: preferences.rankingChanged.app,
      //     news_updates_email: preferences.newsUpdates.email,
      //     news_updates_app: preferences.newsUpdates.app,
      //     updated_at: new Date().toISOString()
      //   });
      // 
      // if (error) throw error;
      
      setNotificationPreferences(preferences);
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      return { success: false, error: error.message };
    }
  };

  // Fonction pour changer le mot de passe
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      // const { error } = await supabase.auth.updateUser({
      //   password: newPassword
      // });
      // 
      // if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return { success: false, error: error.message };
    }
  };

  // Initialisation unique du mode sombre
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

  // Gestionnaire du mode sombre
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

  // Sections de navigation
  const sections = [
    {
      id: 'profile' as const,
      label: 'Informations du Profil',
      icon: 'ri-user-line',
      description: 'Gérez vos informations personnelles'
    },
    {
      id: 'notifications' as const,
      label: 'Préférences de notification',
      icon: 'ri-notification-3-line',
      description: 'Contrôlez comment vous êtes contacté'
    },
    {
      id: 'resources' as const,
      label: 'Ressources et Support',
      icon: 'ri-customer-service-line',
      description: 'Accédez aux documents et à l\'aide'
    }
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <ApporteurHeader 
        darkMode={darkMode} 
        setDarkMode={handleDarkModeToggle}
        userData={userData}
      />
      
      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light text-gray-900 dark:text-white mb-4">
              Profil & Paramètres
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6 sticky top-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Navigation
              </h3>
              
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${
                      activeSection === section.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-[#335FAD] dark:text-[#335FAD]/80 border border-indigo-200 dark:border-indigo-700'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <i className={`${section.icon} text-lg`}></i>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{section.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {activeSection === 'profile' && (
              <ProfileInfo
                userData={userData}
                onSave={saveUserData}
                onChangePassword={changePassword}
              />
            )}
            
            {activeSection === 'notifications' && (
              <NotificationSettings
                preferences={notificationPreferences}
                onSave={saveNotificationPreferences}
              />
            )}
            
            {activeSection === 'resources' && (
              <ResourcesSection />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
