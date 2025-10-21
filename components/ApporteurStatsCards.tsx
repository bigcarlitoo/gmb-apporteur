
'use client';

import { useState, useEffect } from 'react';

// Interface pour les statistiques utilisateur depuis Supabase
interface UserStats {
  dossiersEnvoyes: number;
  economiesGenerees: number;
  classement: number;
  totalApporteurs: number;
  progressionDossiers: number;
  progressionEconomies: number;
  progressionClassement: string;
}

// Fonction pour déterminer si on peut afficher la progression
const canShowProgression = (progression: number): boolean => {
  // Afficher seulement si la progression est significative (entre 1% et 999%)
  return progression > 0 && progression < 1000 && progression !== 0;
};

// Interface pour les données historiques des graphiques
interface ChartData {
  dossiers: number[];
  economies: number[];
  classementHistory: number[];
}

interface ApporteurStatsCardsProps {
  userStats: UserStats;
}

export default function ApporteurStatsCards({ userStats }: ApporteurStatsCardsProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  // TODO: SUPABASE - Remplacer par les vraies données historiques depuis la base de données
  const [chartData, setChartData] = useState<ChartData>({
    dossiers: [20, 35, 28, 42, 38, 45, 42],
    economies: [3200, 3800, 4100, 4350, 4200, 4400, 4350],
    classementHistory: [85, 82, 88, 85, 90, 87, 85]
  });

  // TODO: SUPABASE INTEGRATION FUNCTIONS
  // Fonction pour récupérer les données historiques des graphiques
  const fetchChartData = async () => {
    try {
      // const { data: dossiersData, error: dossiersError } = await supabase
      //   .from('user_stats_history')
      //   .select('dossiers_envoyes, created_at')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: true })
      //   .limit(7);
      // 
      // const { data: economiesData, error: economiesError } = await supabase
      //   .from('user_stats_history')
      //   .select('economies_generees, created_at')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: true })
      //   .limit(7);
      // 
      // if (dossiersError || economiesError) throw new Error('Erreur chargement données');
      // 
      // setChartData({
      //   dossiers: dossiersData.map(d => d.dossiers_envoyes),
      //   economies: economiesData.map(d => d.economies_generees),
      //   classementHistory: [...] // Calculer depuis les données de classement
      // });
    } catch (error) {
      console.error('Erreur lors du chargement des données graphiques:', error);
    }
  };

  // Défilement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4000);

    // TODO: SUPABASE - Appeler le chargement des données historiques
    // fetchChartData();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-12">
      {/* Desktop Grid */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Dossiers Envoyés */}
        <div className="relative group">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-100 dark:border-gray-700 hover:border-[#335FAD]/20 dark:hover:border-[#335FAD]/60 transition-all duration-300 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#335FAD]/5 dark:from-[#335FAD]/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-2xl flex items-center justify-center border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                  <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD] text-2xl"></i>
                </div>
                <div className="text-right">
                  {/* Badge de progression conditionnel */}
                  {canShowProgression(userStats.progressionDossiers) && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                        +{userStats.progressionDossiers}%
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                {/* TODO: SUPABASE - Utiliser userStats.dossiersEnvoyes */}
                <h3 className="text-4xl font-light text-gray-900 dark:text-white mb-2">{userStats.dossiersEnvoyes}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Dossiers envoyés</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ce mois-ci</p>
              </div>

              {/* Mini Chart - TODO: SUPABASE - Utiliser chartData.dossiers */}
              <div className="flex items-end space-x-1 h-8">
                {chartData.dossiers.map((height, index) => (
                  <div
                    key={index}
                    className="bg-[#335FAD]/20 dark:bg-[#335FAD]/70 rounded-sm flex-1 transition-all duration-300 group-hover:bg-[#335FAD]/30 dark:group-hover:bg-[#335FAD]/60"
                    style={{ height: `${(height / Math.max(...chartData.dossiers)) * 100}%` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Économies Clients */}
        <div className="relative group">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-600 transition-all duration-300 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 dark:from-emerald-900/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-700">
                  <i className="ri-money-euro-circle-line text-emerald-600 dark:text-emerald-400 text-2xl"></i>
                </div>
                <div className="text-right">
                  {/* Badge de progression conditionnel */}
                  {canShowProgression(userStats.progressionEconomies) && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                        +{userStats.progressionEconomies}%
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                {/* TODO: SUPABASE - Utiliser userStats.economiesGenerees avec formatage */}
                <h3 className="text-4xl font-light text-gray-900 dark:text-white mb-2">€{userStats.economiesGenerees.toLocaleString()}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Économies générées</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pour vos clients</p>
              </div>

              {/* Mini Chart - TODO: SUPABASE - Utiliser chartData.economies */}
              <div className="flex items-end space-x-1 h-8">
                {chartData.economies.map((value, index) => {
                  const minValue = Math.min(...chartData.economies);
                  const maxValue = Math.max(...chartData.economies);
                  return (
                    <div
                      key={index}
                      className="bg-emerald-200 dark:bg-emerald-700 rounded-sm flex-1 transition-all duration-300 group-hover:bg-emerald-300 dark:group-hover:bg-emerald-600"
                      style={{ height: `${((value - minValue) / (maxValue - minValue)) * 100}%` }}
                    ></div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Classement */}
        <div className="relative group">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-600 transition-all duration-300 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 dark:from-amber-900/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-700">
                  <i className="ri-trophy-line text-amber-600 dark:text-amber-400 text-2xl"></i>
                </div>
                <div className="text-right">
                  {/* Badge de progression conditionnel pour le classement */}
                  {userStats.progressionClassement && userStats.progressionClassement !== 'Nouveau' && userStats.progressionClassement !== 'Non classé' && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700">
                        {userStats.progressionClassement}
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                {/* TODO: SUPABASE - Utiliser userStats.classement */}
                <h3 className="text-4xl font-light text-gray-900 dark:text-white mb-2">#{userStats.classement}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Classement GMB</p>
                {/* TODO: SUPABASE - Utiliser userStats.totalApporteurs */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sur {userStats.totalApporteurs} apporteurs</p>
              </div>

              {/* Ranking Bars - TODO: SUPABASE - Calculer le pourcentage depuis le classement */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-400 dark:bg-amber-500 rounded-full"></div>
                  <div className="flex-1 bg-amber-100 dark:bg-amber-900/30 rounded-full h-1.5 border border-amber-200 dark:border-amber-700">
                    <div 
                      className="bg-amber-400 dark:bg-amber-500 h-1.5 rounded-full" 
                      style={{ width: `${((userStats.totalApporteurs - userStats.classement + 1) / userStats.totalApporteurs) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {Math.round(((userStats.totalApporteurs - userStats.classement + 1) / userStats.totalApporteurs) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Dossiers Envoyés - Mobile */}
            <div className="w-full flex-shrink-0 px-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border-2 border-gray-100 dark:border-gray-700 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-2xl flex items-center justify-center border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                    <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD] text-xl"></i>
                  </div>
                  {canShowProgression(userStats.progressionDossiers) && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">
                        +{userStats.progressionDossiers}%
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-3xl font-light text-gray-900 dark:text-white mb-1">{userStats.dossiersEnvoyes}</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Dossiers envoyés</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ce mois-ci</p>
                </div>

                <div className="flex items-end space-x-1 h-6">
                  {chartData.dossiers.map((height, index) => (
                    <div
                      key={index}
                      className="bg-[#335FAD]/20 dark:bg-[#335FAD]/70 rounded-sm flex-1"
                      style={{ height: `${(height / Math.max(...chartData.dossiers)) * 100}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Économies Clients - Mobile */}
            <div className="w-full flex-shrink-0 px-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border-2 border-gray-100 dark:border-gray-700 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center border border-emerald-200 dark:border-emerald-700">
                    <i className="ri-money-euro-circle-line text-emerald-600 dark:text-emerald-400 text-xl"></i>
                  </div>
                  {canShowProgression(userStats.progressionEconomies) && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                        +{userStats.progressionEconomies}%
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-3xl font-light text-gray-900 dark:text-white mb-1">€{userStats.economiesGenerees.toLocaleString()}</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Économies générées</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pour vos clients</p>
                </div>

                <div className="flex items-end space-x-1 h-6">
                  {chartData.economies.map((value, index) => {
                    const minValue = Math.min(...chartData.economies);
                    const maxValue = Math.max(...chartData.economies);
                    return (
                      <div
                        key={index}
                        className="bg-emerald-200 dark:bg-emerald-700 rounded-sm flex-1"
                        style={{ height: `${((value - minValue) / (maxValue - minValue)) * 100}%` }}
                      ></div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Classement - Mobile */}
            <div className="w-full flex-shrink-0 px-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border-2 border-gray-100 dark:border-gray-700 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-700">
                    <i className="ri-trophy-line text-amber-600 dark:text-amber-400 text-xl"></i>
                  </div>
                  {userStats.progressionClassement && userStats.progressionClassement !== 'Nouveau' && userStats.progressionClassement !== 'Non classé' && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700">
                        {userStats.progressionClassement}
                      </span>
                      <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">vs mois dernier</span>
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-3xl font-light text-gray-900 dark:text-white mb-1">#{userStats.classement}</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Classement GMB</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sur {userStats.totalApporteurs} apporteurs</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-400 dark:bg-amber-500 rounded-full"></div>
                  <div className="flex-1 bg-amber-100 dark:bg-amber-900/30 rounded-full h-1.5 border border-amber-200 dark:border-amber-700">
                    <div 
                      className="bg-amber-400 dark:bg-amber-500 h-1.5 rounded-full" 
                      style={{ width: `${((userStats.totalApporteurs - userStats.classement + 1) / userStats.totalApporteurs) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {Math.round(((userStats.totalApporteurs - userStats.classement + 1) / userStats.totalApporteurs) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center space-x-2 mt-6">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                currentSlide === index 
                  ? 'bg-[#335FAD] dark:bg-[#335FAD]' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
