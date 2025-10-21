
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ApporteurHeader from '../components/ApporteurHeader';
import ApporteurStatsCards from '../components/ApporteurStatsCards';
import ApporteurActivity from '../components/ApporteurActivity';
import ApporteurRanking from '../components/ApporteurRanking';
import { ApporteursService } from '@/lib/services/apporteurs';

// TODO: SUPABASE INTEGRATION
// Interface pour les données utilisateur depuis Supabase
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les statistiques depuis Supabase
interface UserStats {
  dossiersEnvoyes: number;
  economiesGenerees: number;
  classement: number;
  totalApporteurs: number;
  progressionDossiers: number;
  progressionEconomies: number;
  progressionClassement: string;
}

export default function ApporteurDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les données utilisateur et statistiques
  const [userData, setUserData] = useState<UserData>({
    id: '1',
    firstName: 'Marie',
    lastName: 'Dubois',
    initials: 'MD',
    role: 'Apporteur Premium'
  });

  const [userStats, setUserStats] = useState<UserStats>({
    dossiersEnvoyes: 0,
    economiesGenerees: 0,
    classement: 0,
    totalApporteurs: 0,
    progressionDossiers: 0,
    progressionEconomies: 0,
    progressionClassement: ''
  });

  // Fonction pour récupérer les données utilisateur
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 fetchUserData - Début du chargement');
      
      // Utiliser le premier apporteur comme utilisateur connecté pour la démo
      const apporteursData = await ApporteursService.getAllApporteurs();
      console.log('👥 fetchUserData - Apporteurs récupérés:', apporteursData?.length);
      
      if (apporteursData && apporteursData.length > 0) {
        const apporteur = apporteursData[0];
        console.log('👤 fetchUserData - Apporteur sélectionné:', apporteur.prenom, apporteur.nom);
        
        setUserData({
          id: apporteur.id,
          firstName: apporteur.prenom,
          lastName: apporteur.nom,
          initials: `${apporteur.prenom.charAt(0)}${apporteur.nom.charAt(0)}`,
          role: 'Apporteur Premium'
        });
        
        // Récupérer les statistiques
        console.log('📊 fetchUserData - Récupération des stats pour:', apporteur.id);
        const stats = await ApporteursService.getApporteurStats(apporteur.id);
        console.log('📈 fetchUserData - Stats récupérées:', stats);
        
        setUserStats({
          dossiersEnvoyes: stats.totalDossiers,
          economiesGenerees: stats.economiesGenerees,
          classement: stats.classement,
          totalApporteurs: stats.totalApporteurs || apporteursData.length,
          progressionDossiers: stats.progressionDossiers,
          progressionEconomies: stats.progressionEconomies,
          progressionClassement: stats.progressionClassement
        });
      } else {
        console.warn('⚠️ fetchUserData - Aucun apporteur trouvé');
        setError('Aucun apporteur trouvé');
      }
    } catch (error) {
      console.error('❌ fetchUserData - Erreur détaillée:', error);
      console.error('❌ fetchUserData - Type d\'erreur:', typeof error);
      console.error('❌ fetchUserData - Stack:', error instanceof Error ? error.stack : 'Pas de stack');
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

  // Initialisation unique du mode sombre et chargement des données
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
      fetchUserData();
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

  // Gestionnaire pour le bouton Nouveau Dossier
  const handleNouveauDossier = () => {
    router.push('/nouveau-dossier');
  };

  if (!isInitialized || loading) {
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
        setDarkMode={handleDarkModeToggle}
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

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 text-center lg:text-left">
                Bonjour, <span className="font-medium text-[#335FAD] dark:text-[#335FAD]">{userData.firstName}</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 text-center lg:text-left">
                Bienvenue sur votre tableau de bord
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          {/* Activité Récente */}
          <div className="xl:col-span-2">
            <ApporteurActivity userId={userData.id} />
          </div>
          
          {/* Classement */}
          <div>
            <ApporteurRanking userData={userData} userStats={userStats} />
          </div>
        </div>
      </main>
    </div>
  );
}