'use client';

import { useMemo } from 'react';

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

interface AdminStatsCardsProps {
  adminStats: AdminStats;
}

export default function AdminStatsCards({ adminStats }: AdminStatsCardsProps) {
  // Formatage des montants
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Configuration des cartes de statistiques
  const statsCards = useMemo(() => [
    {
      title: 'En attente de traitement',
      value: adminStats.dossiersEnAttente,
      icon: 'ri-time-line',
      color: 'orange',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-700 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      description: 'Dossiers à traiter',
      trend: null
    },
    {
      title: 'Validation apporteur',
      value: adminStats.dossiersValidationApporteur,
      icon: 'ri-user-check-line',
      color: 'blue',
      bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
      textColor: 'text-[#335FAD] dark:text-[#335FAD]',
      iconBg: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
      iconColor: 'text-[#335FAD] dark:text-[#335FAD]',
      description: 'En attente de validation',
      trend: null
    },
    {
      title: 'Finalisés ce mois',
      value: adminStats.dossiersFinalises,
      icon: 'ri-check-double-line',
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      description: 'Dossiers terminés',
      trend: `+${adminStats.progressionDossiers}%`,
      trendPositive: adminStats.progressionDossiers > 0
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatAmount(adminStats.chiffreAffairesMois),
      icon: 'ri-money-euro-circle-line',
      color: 'indigo',
      bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
      textColor: 'text-[#335FAD] dark:text-[#335FAD]',
      iconBg: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
      iconColor: 'text-[#335FAD] dark:text-[#335FAD]',
      description: 'Ce mois-ci',
      trend: `+${adminStats.progressionChiffre}%`,
      trendPositive: adminStats.progressionChiffre > 0,
      isAmount: true
    },
    {
      title: 'Total dossiers',
      value: adminStats.totalDossiers,
      icon: 'ri-file-list-line',
      color: 'purple',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-700 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      description: 'Tous les dossiers',
      trend: null
    },
    {
      title: 'Nouveaux apporteurs',
      value: adminStats.nouveauxApporteurs,
      icon: 'ri-user-add-line',
      color: 'teal',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      textColor: 'text-teal-700 dark:text-teal-400',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      description: 'Ce mois-ci',
      trend: null
    }
  ], [adminStats, formatAmount]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {statsCards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <i className={`${card.icon} ${card.iconColor} text-lg`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {card.title}
                  </p>
                </div>
              </div>
              
              <div className="mb-2">
                <p className={`text-2xl sm:text-3xl font-light text-gray-900 dark:text-white ${card.isAmount ? 'text-xl sm:text-2xl' : ''}`}>
                  {card.value}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {card.description}
                </p>
                
                {card.trend && (
                  <div className={`flex items-center space-x-1 ${
                    card.trendPositive 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    <i className={`${
                      card.trendPositive 
                        ? 'ri-arrow-up-line' 
                        : 'ri-arrow-down-line'
                    } text-xs`}></i>
                    <span className="text-xs font-medium">{card.trend}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}