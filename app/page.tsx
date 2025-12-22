
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ApporteurHeader from '../components/ApporteurHeader';
import ApporteurStatsCards from '../components/ApporteurStatsCards';
import ApporteurActivity from '../components/ApporteurActivity';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/services/api';
import { ApporteursService } from '@/lib/services/apporteurs';

// Interface pour les données utilisateur
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les statistiques
interface UserStats {
  dossiersEnvoyes: number;
  economiesGenerees: number;
  totalApporteurs: number;
  progressionDossiers: number;
  progressionEconomies: number;
}

// Fonction pour obtenir le message de salutation en fonction de l'heure locale
const getGreeting = (date: Date): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export default function ApporteurDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Utilisation du hook centralisé pour le dark mode
  const { darkMode, isInitialized, toggleDarkMode } = useTheme();
  
  // États pour les données utilisateur et statistiques
  const [userData, setUserData] = useState<UserData>({
    id: '',
    firstName: '',
    lastName: '',
    initials: '',
    role: 'Apporteur'
  });

  const [userStats, setUserStats] = useState<UserStats>({
    dossiersEnvoyes: 0,
    economiesGenerees: 0,
    totalApporteurs: 0,
    progressionDossiers: 0,
    progressionEconomies: 0
  });

  // Fonction pour récupérer les données utilisateur connecté
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer le profil apporteur de l'utilisateur connecté
      const apporteur = await api.getCurrentApporteurProfile();
      
      if (apporteur) {
        setUserData({
          id: apporteur.id,
          firstName: apporteur.prenom,
          lastName: apporteur.nom,
          initials: `${apporteur.prenom.charAt(0)}${apporteur.nom.charAt(0)}`,
          role: 'Apporteur'
        });
        
        // Récupérer les statistiques
        const stats = await ApporteursService.getApporteurStats(apporteur.id);
        
        setUserStats({
          dossiersEnvoyes: stats.totalDossiers,
          economiesGenerees: stats.economiesGenerees,
          totalApporteurs: stats.totalApporteurs || 0,
          progressionDossiers: stats.progressionDossiers,
          progressionEconomies: stats.progressionEconomies
        });
      } else {
        setError('Profil apporteur non trouvé. Contactez votre administrateur.');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError(`Erreur lors du chargement des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

  // ✅ Le dark mode est géré par le hook useTheme
  // Chargement initial des données quand l'auth est terminée
  useEffect(() => {
    if (isInitialized && !authLoading && user) {
      fetchUserData();
    }
  }, [isInitialized, authLoading, user]);

  // Gestionnaire pour le bouton Nouveau Dossier
  const handleNouveauDossier = () => {
    router.push('/nouveau-dossier');
  };

  if (!isInitialized || authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchUserData()}
            className="bg-[#335FAD] text-white px-4 py-2 rounded-lg hover:bg-[#335FAD]/90"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <ApporteurHeader 
        darkMode={darkMode} 
        setDarkMode={toggleDarkMode}
        userData={userData}
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
                {getGreeting(currentTime)}, <span className="font-medium text-[#335FAD] dark:text-[#335FAD]">{userData.firstName}</span>
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

              {/* Nouveau Dossier Button - Desktop à droite */}
              <button 
                onClick={handleNouveauDossier}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-3 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-xl"></i>
                <span>Nouveau Dossier</span>
              </button>
            </div>

            {/* Mobile Button */}
            <div className="lg:hidden flex justify-center">
              <button 
                onClick={handleNouveauDossier}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-3 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-xl"></i>
                <span>Nouveau Dossier</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        {/* Performance Section Title */}
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 text-xl font-light">
            Votre performance ce mois-ci
          </p>
        </div>

        <ApporteurStatsCards userStats={userStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 mt-8">
          {/* Activité Récente */}
          <div>
            <ApporteurActivity userId={userData.id} />
          </div>
        </div>
      </main>
    </div>
  );
}