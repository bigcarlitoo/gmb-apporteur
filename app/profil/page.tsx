
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ApporteurHeader from '../../components/ApporteurHeader';
import ProfileInfo from './ProfileInfo';
import NotificationSettings from './NotificationSettings';
import ResourcesSection from './ResourcesSection';
import CabinetSection from './CabinetSection';
import WalletSection from './WalletSection';
import { supabase } from '@/lib/supabase';

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

// Interface pour les infos du cabinet
interface CabinetInfo {
  broker_id: string;
  broker_name: string;
  owner_name?: string;
  joined_at?: string;
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
  const [activeSection, setActiveSection] = useState<'profile' | 'wallet' | 'cabinet' | 'notifications' | 'resources'>('profile');

  // État pour les données utilisateur
  const [userData, setUserData] = useState<UserData>({
    id: '',
    firstName: '',
    lastName: '',
    initials: '',
    role: 'Apporteur',
    email: '',
    phone: ''
  });

  // État pour les infos du cabinet
  const [cabinetInfo, setCabinetInfo] = useState<CabinetInfo | null>(null);
  const [cabinetLoading, setCabinetLoading] = useState(true);

  // État pour les préférences de notification
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    devisAvailable: { email: true, app: true },
    dossierFinalized: { email: true, app: true },
    rankingChanged: { email: false, app: true },
    newsUpdates: { email: false, app: false }
  });

  // Fonction pour récupérer les données utilisateur et du cabinet
  const fetchUserDataAndCabinet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le profil apporteur
      const { data: profile } = await supabase
        .from('apporteur_profiles')
        .select('id, nom, prenom, email, telephone, statut')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserData({
          id: profile.id,
          firstName: profile.prenom || '',
          lastName: profile.nom || '',
          initials: `${(profile.prenom || '')[0] || ''}${(profile.nom || '')[0] || ''}`.toUpperCase(),
          role: 'Apporteur',
          email: profile.email || '',
          phone: profile.telephone || ''
        });

        // Récupérer le cabinet lié
        const { data: brokerLink } = await supabase
          .from('broker_apporteurs')
          .select('broker_id, created_at')
          .eq('apporteur_profile_id', profile.id)
          .single();

        if (brokerLink) {
          // Récupérer les infos du broker via broker_apporteurs avec jointure
          const { data: linkWithBroker } = await supabase
            .from('broker_apporteurs')
            .select(`
              broker_id,
              created_at,
              brokers (
                id,
                name
              )
            `)
            .eq('apporteur_profile_id', profile.id)
            .single();

          if (linkWithBroker?.brokers) {
            const broker = linkWithBroker.brokers as any;
            setCabinetInfo({
              broker_id: broker.id,
              broker_name: broker.name,
              joined_at: linkWithBroker.created_at
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setCabinetLoading(false);
    }
  };

  // Fonction pour quitter le cabinet
  const handleLeaveCabinet = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utilisateur non connecté' };
      }

      // Récupérer le profil apporteur
      const { data: profile } = await supabase
        .from('apporteur_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profil non trouvé' };
      }

      // Supprimer le lien avec le cabinet
      const { error: deleteError } = await supabase
        .from('broker_apporteurs')
        .delete()
        .eq('apporteur_profile_id', profile.id);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // Désactiver le profil apporteur
      const { error: updateError } = await supabase
        .from('apporteur_profiles')
        .update({ statut: 'inactif' })
        .eq('id', profile.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Déconnexion
      await supabase.auth.signOut();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  };

  // Charger les données au montage
  useEffect(() => {
    fetchUserDataAndCabinet();
  }, []);

  // Fonction pour sauvegarder les données utilisateur
  const saveUserData = async (updatedData: Partial<UserData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Non connecté' };

      const { error } = await supabase
        .from('apporteur_profiles')
        .update({
          email: updatedData.email,
          telephone: updatedData.phone,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setUserData(prev => ({ ...prev, ...updatedData }));
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  };

  // Fonction pour sauvegarder les préférences de notification
  const saveNotificationPreferences = async (preferences: NotificationPreferences) => {
    try {
      setNotificationPreferences(preferences);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  };

  // Fonction pour changer le mot de passe
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
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
      id: 'wallet' as const,
      label: 'Mon Wallet',
      icon: 'ri-wallet-3-line',
      description: 'Vos commissions et paiements'
    },
    {
      id: 'cabinet' as const,
      label: 'Mon Cabinet',
      icon: 'ri-building-2-line',
      description: 'Votre cabinet de courtage'
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

            {activeSection === 'wallet' && userData.id && (
              <WalletSection apporteurId={userData.id} />
            )}

            {activeSection === 'cabinet' && (
              <CabinetSection
                cabinetInfo={cabinetInfo}
                loading={cabinetLoading}
                onLeaveCabinet={handleLeaveCabinet}
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
