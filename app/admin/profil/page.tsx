'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../../components/AdminHeader';
import AdminProfileInfo from './AdminProfileInfo';
import AdminNotificationSettings from './AdminNotificationSettings';

// TODO: SUPABASE INTEGRATION
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
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications'>('profile');

  // TODO: SUPABASE - Remplacer par les données réelles de l'administrateur connecté
  const [adminData, setAdminData] = useState<AdminData>({
    id: '1',
    firstName: 'Sophie',
    lastName: 'Martin',
    initials: 'SM',
    role: 'Administrateur Principal',
    companyName: 'GMB Courtage',
    privateEmail: 'sophie.martin@personal.com',
    contactEmail: 'contact@gmb-courtage.fr',
    privatePhone: '06 12 34 56 78',
    professionalPhone: '01 23 45 67 89',
    useSamePhone: false
  });

  // TODO: SUPABASE - Remplacer par les préférences réelles depuis la base de données
  const [notificationPreferences, setNotificationPreferences] = useState<AdminNotificationPreferences>({
    newApporteur: { email: true, app: true },
    dossierSubmitted: { email: true, app: true },
    supportRequest: { email: true, app: true },
    systemAlerts: { email: true, app: true },
    monthlyReport: { email: true, app: false }
  });

  // TODO: SUPABASE INTEGRATION FUNCTIONS
  // Fonction pour récupérer les données administrateur
  const fetchAdminData = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('admin_profiles')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .single();
      // 
      // if (error) throw error;
      // setAdminData({
      //   id: data.user_id,
      //   firstName: data.prenom,
      //   lastName: data.nom,
      //   initials: `${data.prenom[0]}${data.nom[0]}`,
      //   role: data.role || 'Administrateur',
      //   companyName: data.company_name,
      //   privateEmail: data.private_email,
      //   contactEmail: data.contact_email,
      //   privatePhone: data.private_phone,
      //   professionalPhone: data.professional_phone,
      //   useSamePhone: data.use_same_phone
      // });
    } catch (error) {
      console.error('Erreur lors du chargement des données administrateur:', error);
    }
  };

  // Fonction pour récupérer les préférences de notification
  const fetchNotificationPreferences = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('admin_notification_preferences')
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

  // Fonction pour sauvegarder les données administrateur
  const saveAdminData = async (updatedData: Partial<AdminData>) => {
    try {
      // const { error } = await supabase
      //   .from('admin_profiles')
      //   .update({
      //     company_name: updatedData.companyName,
      //     private_email: updatedData.privateEmail,
      //     contact_email: updatedData.contactEmail,
      //     private_phone: updatedData.privatePhone,
      //     professional_phone: updatedData.professionalPhone,
      //     use_same_phone: updatedData.useSamePhone,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('user_id', adminData.id);
      // 
      // if (error) throw error;
      
      // Mettre à jour l'état local
      setAdminData(prev => ({ ...prev, ...updatedData }));
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error.message };
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
      description: 'Gérez vos informations administrateur'
    },
    {
      id: 'notifications' as const,
      label: 'Préférences de notification',
      icon: 'ri-notification-3-line',
      description: 'Contrôlez les alertes administrateur'
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
      <AdminHeader 
        darkMode={darkMode} 
        setDarkMode={handleDarkModeToggle}
        adminData={adminData}
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
          </div>
        </div>
      </main>
    </div>
  );
}