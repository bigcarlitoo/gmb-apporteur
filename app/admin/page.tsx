
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '../../components/AdminHeader';
import AdminStatsCards from '../../components/AdminStatsCards';
import AdminActivityConnected from '../../components/AdminActivityConnected';
import AdminRanking from '../../components/AdminRanking';

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
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // TODO: SUPABASE - Remplacer par les données réelles de l'admin connecté
  const adminData = useMemo<AdminData>(() => ({
    id: 'admin1',
    firstName: 'Alexandre',
    lastName: 'Martin',
    initials: 'AM',
    role: 'Administrateur'
  }), []);

  // TODO: SUPABASE - Remplacer par les vraies stats depuis la base de données
  const adminStats = useMemo<AdminStats>(() => ({
    dossiersEnAttente: 12,
    dossiersValidationApporteur: 8,
    dossiersFinalises: 67,
    totalDossiers: 234,
    nouveauxApporteurs: 3,
    chiffreAffairesMois: 127500,
    progressionDossiers: 18,
    progressionChiffre: 12
  }), []);

  // TODO: SUPABASE INTEGRATION FUNCTIONS
  // Fonction pour récupérer les données admin
  const fetchAdminData = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('admin_users')
      //   .select('*')
      //   .eq('id', adminId)
      //   .single();
      // 
      // if (error) throw error;
      // setAdminData(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données admin:', error);
    }
  };

  // Fonction pour récupérer les statistiques admin
  const fetchAdminStats = async () => {
    try {
      // const { data, error } = await supabase
      //   .from('admin_stats')
      //   .select('*')
      //   .eq('admin_id', adminId)
      //   .single();
      // 
      // if (error) throw error;
      // setAdminStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  // Timer pour l'heure
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Gestionnaire pour le bouton Nouveau Dossier Admin
  const handleNouveauDossierAdmin = () => {
    router.push('/admin/nouveau-dossier');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* TODO: SUPABASE - Passer les vraies données admin */}
      <AdminHeader 
        darkMode={darkMode} 
        setDarkMode={handleDarkModeToggle}
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

              {/* TODO: SUPABASE - Utiliser adminData.firstName */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4 text-center lg:text-left">
                Bonjour, <span className="font-medium text-[#335FAD] dark:text-[#335FAD]">{adminData.firstName}</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 text-center lg:text-left">
                Tableau de bord administrateur - Vue d'ensemble de la plateforme
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
        {/* Section Title */}
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 text-xl font-light">
            Indicateurs clés de performance
          </p>
        </div>

        {/* TODO: SUPABASE - Passer les vraies statistiques */}
        <AdminStatsCards adminStats={adminStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          {/* Activité Récente */}
          <div className="xl:col-span-2">
            {/* TODO: SUPABASE - Activité de toute la plateforme */}
            <AdminActivityConnected limit={12} />
          </div>
          
          {/* Classement des Apporteurs */}
          <div>
            {/* TODO: SUPABASE - Classement complet des apporteurs */}
            <AdminRanking limit={8} showEvolution={true} />
          </div>
        </div>
      </main>
    </div>
  );
}