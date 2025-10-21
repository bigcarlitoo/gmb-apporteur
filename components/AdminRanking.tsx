
'use client';

import { useState, useEffect } from 'react';

interface ApporteurRanking {
  id: string;
  nom: string;
  prenom: string;
  initials: string;
  position: number;
  dossiersTraites: number; // Changé de dossiersValides vers dossiersTraites
  economiesGenerees: number; // Changé de chiffreAffaires vers economiesGenerees
  evolutionPosition: number; // +1, -1, 0
  isNew: boolean;
}

interface AdminRankingProps {
  // Props pour customiser l'affichage
  limit?: number;
  showEvolution?: boolean;
}

export default function AdminRanking({ limit = 10, showEvolution = true }: AdminRankingProps) {
  const [ranking, setRanking] = useState<ApporteurRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'semaine' | 'mois' | 'trimestre'>('mois');

  // TODO: SUPABASE - Récupérer le classement depuis la base de données
  const fetchRanking = async () => {
    setIsLoading(true);
    try {
      // Simulation temporaire - À remplacer par l'appel Supabase
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockRanking: ApporteurRanking[] = [
        {
          id: '1',
          nom: 'Lambert',
          prenom: 'Thomas',
          initials: 'TL',
          position: 1,
          dossiersTraites: 32, // Nombre total de dossiers traités
          economiesGenerees: 85600, // Économies totales générées pour les clients
          evolutionPosition: 0,
          isNew: false
        },
        {
          id: '2',
          nom: 'Dubois',
          prenom: 'Marie',
          initials: 'MD',
          position: 2,
          dossiersTraites: 28,
          economiesGenerees: 74200,
          evolutionPosition: 1,
          isNew: false
        },
        {
          id: '3',
          nom: 'Roux',
          prenom: 'Emma',
          initials: 'ER',
          position: 3,
          dossiersTraites: 25,
          economiesGenerees: 68900,
          evolutionPosition: -1,
          isNew: false
        },
        {
          id: '4',
          nom: 'Bernard',
          prenom: 'Claire',
          initials: 'CB',
          position: 4,
          dossiersTraites: 24,
          economiesGenerees: 62450,
          evolutionPosition: 2,
          isNew: false
        },
        {
          id: '5',
          nom: 'Moreau',
          prenom: 'Julien',
          initials: 'JM',
          position: 5,
          dossiersTraites: 21,
          economiesGenerees: 58300,
          evolutionPosition: 0,
          isNew: true
        },
        {
          id: '6',
          nom: 'Petit',
          prenom: 'Lucas',
          initials: 'LP',
          position: 6,
          dossiersTraites: 19,
          economiesGenerees: 51200,
          evolutionPosition: -2,
          isNew: false
        },
        {
          id: '7',
          nom: 'Girard',
          prenom: 'Alice',
          initials: 'AG',
          position: 7,
          dossiersTraites: 17,
          economiesGenerees: 46700,
          evolutionPosition: 1,
          isNew: false
        },
        {
          id: '8',
          nom: 'Rousseau',
          prenom: 'Paul',
          initials: 'PR',
          position: 8,
          dossiersTraites: 15,
          economiesGenerees: 42800,
          evolutionPosition: 0,
          isNew: false
        }
      ];

      setRanking(mockRanking.slice(0, limit));
    } catch (error) {
      console.error('Erreur lors du chargement du classement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, [timeFilter, limit]);

  // Formatage des montants
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Configuration des positions
  const getPositionConfig = (position: number) => {
    switch (position) {
      case 1:
        return {
          icon: 'ri-trophy-line',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-700'
        };
      case 2:
        return {
          icon: 'ri-medal-line',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          borderColor: 'border-gray-200 dark:border-gray-600'
        };
      case 3:
        return {
          icon: 'ri-award-line',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          borderColor: 'border-orange-200 dark:border-orange-700'
        };
      default:
        return {
          icon: 'ri-user-line',
          color: 'text-[#335FAD] dark:text-[#335FAD]',
          bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
          borderColor: 'border-[#335FAD]/20 dark:border-[#335FAD]/70'
        };
    }
  };

  // Configuration de l'évolution
  const getEvolutionIcon = (evolution: number) => {
    if (evolution > 0) {
      return {
        icon: 'ri-arrow-up-line',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      };
    } else if (evolution < 0) {
      return {
        icon: 'ri-arrow-down-line',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30'
      };
    } else {
      return {
        icon: 'ri-subtract-line',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700'
      };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white">Classement des apporteurs</h2>
            <p className="text-[#335FAD] dark:text-[#335FAD] text-sm font-medium mt-1 bg-[#335FAD]/5 dark:bg-[#335FAD]/30 px-3 py-1 rounded-full border border-[#335FAD]/20 dark:border-[#335FAD]/70 inline-block">
              {new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        
        {/* Filtres temporels */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
          {(['semaine', 'mois', 'trimestre'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeFilter(period)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                timeFilter === period
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Top 5 */}
      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#335FAD] dark:border-[#335FAD]"></div>
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-bar-chart-line text-gray-400 dark:text-gray-500 text-2xl"></i>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Aucun classement disponible</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {ranking.map((apporteur) => {
              const positionConfig = getPositionConfig(apporteur.position);
              const evolutionConfig = getEvolutionIcon(apporteur.evolutionPosition);
              
              return (
                <div key={apporteur.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors duration-200 ${
                  apporteur.position <= 3 
                    ? `${positionConfig.bgColor} ${positionConfig.borderColor}` 
                    : 'bg-gray-50/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100/50 dark:hover:bg-gray-600/50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                      apporteur.position === 1 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' 
                        : apporteur.position === 2 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' 
                        : apporteur.position === 3 
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                    }`}>
                      {apporteur.position}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {apporteur.prenom} {apporteur.nom}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {apporteur.dossiersTraites} dossier{apporteur.dossiersTraites > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center space-x-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                        Économies générées
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(apporteur.economiesGenerees)}
                      </p>
                      <div className="flex items-center justify-end mt-1">
                        {showEvolution && !apporteur.isNew && (
                          <i className={`text-xs ${evolutionConfig.icon} ${evolutionConfig.color}`}></i>
                        )}
                        {apporteur.isNew && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-1 py-0.5 rounded-full font-medium">
                            Nouveau
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
