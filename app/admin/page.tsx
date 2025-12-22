
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../components/AdminHeader';
import AdminStatsCards from '../../components/AdminStatsCards';
import AdminActivityConnected from '../../components/AdminActivityConnected';
import { WalletSummaryCard } from '@/components/features/wallet/WalletSummaryCard';
import { useTheme } from '@/lib/hooks/useTheme';
import { DossiersService } from '@/lib/services/dossiers';
import { ApporteursService } from '@/lib/services/apporteurs';
import { InvitesBanner } from '@/components/features/invites/InvitesBanner';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { useAuth } from '@/components/AuthProvider';

// Fonction pour obtenir le message de salutation en fonction de l'heure locale
const getGreeting = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

// Interface pour les données admin depuis Supabase
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les statistiques admin depuis Supabase
interface AdminStats {
  dossiersEnAttente: number;
  dossiersValidationApporteur: number;
  dossiersFinalises: number;
  totalDossiers: number;
  nouveauxApporteurs: number;
  chiffreAffairesMois: number;
  progressionDossiers: number;
  progressionChiffre: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  // ✅ Utilisation du hook centralisé pour le dark mode
  const { darkMode, isInitialized, toggleDarkMode } = useTheme();

  // ✅ Récupération du contexte broker
  const { currentBrokerId } = useBrokerContext();

  // ✅ Récupération de l'utilisateur connecté
  const { user } = useAuth();

  // ✅ SUPABASE CONNECTED - États pour les vraies données
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ SUPABASE CONNECTED - Données admin depuis l'utilisateur connecté
  const adminData = useMemo<AdminData>(() => {
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

  // ✅ SUPABASE CONNECTED - Récupération des statistiques du dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Paralléliser les appels pour de meilleures performances
      const [dossierStats, apporteurStats] = await Promise.all([
        DossiersService.getAdminDashboardStats(currentBrokerId!),
        ApporteursService.getApporteursDashboardStats(currentBrokerId!)
      ]);

      console.log('📊 Stats dossiers:', dossierStats);
      console.log('👥 Stats apporteurs:', apporteurStats);

      // Mapper vers l'interface AdminStats
      setAdminStats({
        dossiersEnAttente: dossierStats.dossiersEnAttente,
        dossiersValidationApporteur: dossierStats.dossiersDevisDisponible,
        dossiersFinalises: dossierStats.dossiersFinaliseCeMois,
        totalDossiers: dossierStats.totalDossiers,
        nouveauxApporteurs: apporteurStats.nouveauxApporteursCeMois,
        chiffreAffairesMois: dossierStats.economiesCeMois,
        progressionDossiers: dossierStats.progressionDossiers,
        progressionChiffre: dossierStats.progressionEconomies
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement du dashboard:', error);
      setError(error.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Timer pour l'heure
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ SUPABASE CONNECTED - Chargement des données au montage
  useEffect(() => {
    if (currentBrokerId) {
      fetchDashboardData();
    }
  }, [currentBrokerId]);

  // ✅ Le dark mode est géré par le hook useTheme

  // Gestionnaire pour le bouton Nouveau Dossier Admin
  const handleNouveauDossierAdmin = () => {
    router.push('/admin/nouveau-dossier');
  };

  // États de chargement
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
          <p className="text-gray-900 dark:text-white font-medium mb-2">Erreur de chargement</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="bg-[#335FAD] text-white px-6 py-2 rounded-lg hover:bg-[#335FAD]/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Fallback si pas de broker sélectionné
  if (!currentBrokerId) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <AdminHeader
          darkMode={darkMode}
          setDarkMode={toggleDarkMode}
          adminData={adminData}
        />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center max-w-md p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-[#335FAD]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-building-line text-3xl text-[#335FAD]"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Sélectionnez un cabinet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Veuillez sélectionner un cabinet de courtage dans le menu ci-dessus pour accéder au tableau de bord.
            </p>
            <div className="animate-bounce text-[#335FAD]">
              <i className="ri-arrow-up-line text-2xl"></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback si pas de stats
  if (!adminStats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* TODO: SUPABASE - Passer les vraies données admin */}
      <AdminHeader
        darkMode={darkMode}
        setDarkMode={toggleDarkMode}
        adminData={adminData}
      />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              {/* Date - Mobile au-dessus de Bonjour */}
              <div className="mb-4 lg:hidden text-center" suppressHydrationWarning={true}>
                <p className="text-base font-light text-gray-600 dark:text-gray-400" suppressHydrationWarning={true}>
                  {currentTime.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </p>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 text-center lg:text-left" suppressHydrationWarning>
                {getGreeting(currentTime)}, <span className="font-medium text-[#335FAD] dark:text-[#335FAD]">{adminData.firstName}</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 text-center lg:text-left">
                Voici votre tableau de bord
              </p>
            </div>

            {/* Right Side - Desktop only */}
            <div className="hidden lg:flex flex-col items-end space-y-6">
              {/* Date - Desktop à droite */}
              <div className="text-right" suppressHydrationWarning={true}>
                <p className="text-base font-light text-gray-600 dark:text-gray-400" suppressHydrationWarning={true}>
                  {currentTime.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </p>
              </div>

              {/* Actions Admin - Desktop à droite */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleNouveauDossierAdmin}
                  className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-2 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line text-lg"></i>
                  <span>Créer un Dossier</span>
                </button>

                <button
                  onClick={() => router.push('/admin/dossiers')}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-2 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-folder-line text-lg"></i>
                  <span>Tous les Dossiers</span>
                </button>
              </div>
            </div>

            {/* Mobile Buttons */}
            <div className="lg:hidden flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={handleNouveauDossierAdmin}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-lg"></i>
                <span>Créer un Dossier</span>
              </button>

              <button
                onClick={() => router.push('/admin/dossiers')}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-folder-line text-lg"></i>
                <span>Tous les Dossiers</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Banner Invitation (Feature 2) */}
        <div className="mb-8">
          <InvitesBanner />
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 text-xl font-light">
            Indicateurs clés de performance
          </p>
        </div>

        {/* ✅ SUPABASE CONNECTED - Statistiques réelles */}
        <AdminStatsCards adminStats={adminStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          {/* Activité Récente */}
          <div className="xl:col-span-2">
            <AdminActivityConnected limit={6} />
          </div>

          {/* Classement des Apporteurs */}
          <div>
            <WalletSummaryCard />
          </div>
        </div>
      </main>
    </div>
  );
}