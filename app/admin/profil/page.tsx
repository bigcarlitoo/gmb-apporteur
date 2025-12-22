'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import AdminProfileInfo from './AdminProfileInfo';
import AdminNotificationSettings from './AdminNotificationSettings';
import { ExadeConfiguration } from '@/components/features/exade/ExadeConfiguration';
import { BrokerCommissionSettings } from '@/components/features/commission/BrokerCommissionSettings';
import { useAuth } from '@/components/AuthProvider';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { supabase } from '@/lib/supabase';

// Interface pour les données du header (simplifiée)
interface AdminHeaderData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les données administrateur depuis Supabase
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  companyName?: string;
  privateEmail: string;
  contactEmail: string;
  privatePhone: string;
  professionalPhone?: string;
  useSamePhone: boolean;
}

// Interface pour les préférences de notification admin
interface AdminNotificationPreferences {
  newApporteur: {
    email: boolean;
    app: boolean;
  };
  dossierSubmitted: {
    email: boolean;
    app: boolean;
  };
  supportRequest: {
    email: boolean;
    app: boolean;
  };
  systemAlerts: {
    email: boolean;
    app: boolean;
  };
  monthlyReport: {
    email: boolean;
    app: boolean;
  };
}

export default function AdminProfilPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'commissions' | 'exade'>('profile');
  const [loading, setLoading] = useState(true);
  
  // ✅ Récupération de l'utilisateur connecté et du broker
  const { user } = useAuth();
  const { currentBrokerId } = useBrokerContext();

  // ✅ Données du header depuis l'utilisateur connecté (cohérent avec le dashboard)
  const adminHeaderData = useMemo<AdminHeaderData>(() => {
    const firstName = user?.user_metadata?.prenom || 'Admin';
    const lastName = user?.user_metadata?.nom || '';
    return {
      id: user?.id || 'admin1',
      firstName,
      lastName,
      initials: `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase(),
      role: 'Administrateur'
    };
  }, [user]);

  // Données du profil (peuvent être éditées séparément)
  const [adminData, setAdminData] = useState<AdminData>({
    id: '',
    firstName: '',
    lastName: '',
    initials: '',
    role: 'Administrateur',
    companyName: '',
    privateEmail: '',
    contactEmail: '',
    privatePhone: '',
    professionalPhone: '',
    useSamePhone: false
  });

  // ✅ Charger les données complètes depuis la DB
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !currentBrokerId) return;
      
      setLoading(true);
      try {
        // Récupérer les données du broker
        const { data: brokerData, error: brokerError } = await supabase
          .from('brokers')
          .select('name, billing_email, billing_address')
          .eq('id', currentBrokerId)
          .single();

        if (brokerError) {
          console.error('Erreur lors de la récupération du broker:', brokerError);
        }

        // Mettre à jour les données admin avec les infos de la DB
        setAdminData({
          id: user.id,
          firstName: user.user_metadata?.prenom || '',
          lastName: user.user_metadata?.nom || '',
          initials: `${(user.user_metadata?.prenom || 'A').charAt(0)}${(user.user_metadata?.nom || '').charAt(0)}`.toUpperCase(),
          role: 'Administrateur',
          companyName: brokerData?.name || '',
          privateEmail: user.email || '',
          contactEmail: brokerData?.billing_email || user.email || '',
          privatePhone: user.user_metadata?.telephone || '',
          professionalPhone: '',
          useSamePhone: true
        });
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, currentBrokerId]);

  // TODO: SUPABASE - Remplacer par les préférences réelles depuis la base de données
  const [notificationPreferences, setNotificationPreferences] = useState<AdminNotificationPreferences>({
    newApporteur: { email: true, app: true },
    dossierSubmitted: { email: true, app: true },
    supportRequest: { email: true, app: true },
    systemAlerts: { email: true, app: true },
    monthlyReport: { email: true, app: false }
  });

  // ✅ Fonction pour sauvegarder les données administrateur dans la DB
  const saveAdminData = async (updatedData: Partial<AdminData>) => {
    if (!currentBrokerId) {
      return { success: false, error: 'Broker non trouvé' };
    }

    try {
      // Mettre à jour les données du broker (nom société, email contact)
      const { error: brokerError } = await supabase
        .from('brokers')
        .update({
          name: updatedData.companyName,
          billing_email: updatedData.contactEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBrokerId);

      if (brokerError) {
        console.error('Erreur lors de la mise à jour du broker:', brokerError);
        throw brokerError;
      }

      // Mettre à jour les métadonnées utilisateur (téléphone) si nécessaire
      if (updatedData.privatePhone) {
        const { error: userError } = await supabase.auth.updateUser({
          data: {
            telephone: updatedData.privatePhone
          }
        });

        if (userError) {
          console.error('Erreur lors de la mise à jour du téléphone:', userError);
          // Ne pas bloquer si l'update user échoue
        }
      }

      // Mettre à jour l'état local
      setAdminData(prev => ({ ...prev, ...updatedData }));
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  };

  // Fonction pour sauvegarder les préférences de notification
  const saveNotificationPreferences = async (preferences: AdminNotificationPreferences) => {
    try {
      // const { error } = await supabase
      //   .from('admin_notification_preferences')
      //   .upsert({
      //     user_id: adminData.id,
      //     new_apporteur_email: preferences.newApporteur.email,
      //     new_apporteur_app: preferences.newApporteur.app,
      //     dossier_submitted_email: preferences.dossierSubmitted.email,
      //     dossier_submitted_app: preferences.dossierSubmitted.app,
      //     support_request_email: preferences.supportRequest.email,
      //     support_request_app: preferences.supportRequest.app,
      //     system_alerts_email: preferences.systemAlerts.email,
      //     system_alerts_app: preferences.systemAlerts.app,
      //     monthly_report_email: preferences.monthlyReport.email,
      //     monthly_report_app: preferences.monthlyReport.app,
      //     updated_at: new Date().toISOString()
      //   });
      // 
      // if (error) throw error;

      setNotificationPreferences(preferences);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      return { success: false, error: error?.message || 'Erreur inconnue' };
    }
  };

  // ✅ Fonction pour changer le mot de passe via Supabase Auth
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
      description: 'Gérez vos informations administrateur'
    },
    {
      id: 'notifications' as const,
      label: 'Préférences de notification',
      icon: 'ri-notification-3-line',
      description: 'Contrôlez les alertes administrateur'
    },
    {
      id: 'commissions' as const,
      label: 'Commissions & Apporteurs',
      icon: 'ri-percent-line',
      description: 'Définissez les taux de commission'
    },
    {
      id: 'exade' as const,
      label: 'Configuration Exade',
      icon: 'ri-plug-line',
      description: 'Gérez la connexion au tarificateur'
    }
  ];

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <AdminHeader
        darkMode={darkMode}
        setDarkMode={handleDarkModeToggle}
        adminData={adminHeaderData}
      />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl sm:text-4xl font-light text-gray-900 dark:text-white mb-4">
              Profil Administrateur
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Gérez vos informations administrateur et vos préférences système
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
                    className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${activeSection === section.id
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
              <AdminProfileInfo
                adminData={adminData}
                onSave={saveAdminData}
                onChangePassword={changePassword}
              />
            )}

            {activeSection === 'notifications' && (
              <AdminNotificationSettings
                preferences={notificationPreferences}
                onSave={saveNotificationPreferences}
              />
            )}

            {activeSection === 'commissions' && currentBrokerId && (
              <BrokerCommissionSettings brokerId={currentBrokerId} />
            )}

            {activeSection === 'exade' && (
              <ExadeConfiguration />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}