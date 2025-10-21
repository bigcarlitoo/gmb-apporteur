'use client';

import { useState } from 'react';

type DossierType = 'seul' | 'couple';

interface DossierTypeSelectionProps {
  selectedType: DossierType;
  onTypeSelect: (type: DossierType) => void;
}

export default function DossierTypeSelection({ selectedType, onTypeSelect }: DossierTypeSelectionProps) {
  const [hoveredType, setHoveredType] = useState<DossierType | null>(null);

  const dossierTypes = [
    {
      type: 'seul' as DossierType,
      title: 'Emprunteur seul',
      subtitle: 'Personne célibataire ou dossier individuel',
      icon: 'ri-user-line',
      description: 'Idéal pour une personne seule souhaitant souscrire une assurance emprunteur',
      features: [
        'Formulaire simplifié',
        'Documents personnels uniquement',
        'Traitement accéléré'
      ],
      color: 'indigo'
    },
    {
      type: 'couple' as DossierType,
      title: 'Couple',
      subtitle: 'Deux emprunteurs (mariés, pacsés ou concubins)',
      icon: 'ri-team-line',
      description: 'Pour un couple souhaitant une couverture commune ou séparée',
      features: [
        'Informations des deux conjoints',
        'Documents pour chaque emprunteur',
        'Optimisation des garanties'
      ],
      color: 'emerald'
    }
  ];

  const getColorClasses = (color: string, isSelected: boolean, isHovered: boolean) => {
    const colors = {
      indigo: {
        bg: isSelected ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/20' : isHovered ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/10' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-[#335FAD]/30 dark:border-[#335FAD]/60' : isHovered ? 'border-[#335FAD]/20 dark:border-[#335FAD]/70' : 'border-gray-200 dark:border-gray-700',
        icon: isSelected ? 'text-[#335FAD] dark:text-[#335FAD] bg-[#335FAD]/10 dark:bg-[#335FAD]/30' : 'text-[#335FAD]/80 dark:text-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/20',
        title: isSelected ? 'text-[#335FAD] dark:text-[#335FAD]' : 'text-gray-900 dark:text-white',
        check: 'text-[#335FAD] dark:text-[#335FAD] bg-[#335FAD]/10 dark:bg-[#335FAD]/30'
      },
      emerald: {
        bg: isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : isHovered ? 'bg-emerald-25 dark:bg-emerald-900/10' : 'bg-white dark:bg-gray-800',
        border: isSelected ? 'border-emerald-300 dark:border-emerald-600' : isHovered ? 'border-emerald-200 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700',
        icon: isSelected ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' : 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
        title: isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white',
        check: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-4">
          Choisissez le type de dossier
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          Sélectionnez le type d'emprunteur pour adapter le formulaire à votre situation
        </p>
      </div>

      {/* Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
        {dossierTypes.map((type) => {
          const isSelected = selectedType === type.type;
          const isHovered = hoveredType === type.type;
          const colorClasses = getColorClasses(type.color, isSelected, isHovered);

          return (
            <div
              key={type.type}
              className={`relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg group ${colorClasses.bg} ${colorClasses.border}`}
              onClick={() => onTypeSelect(type.type)}
              onMouseEnter={() => setHoveredType(type.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${colorClasses.check} border-2 border-white dark:border-gray-800`}>
                  <i className="ri-check-line text-sm font-bold"></i>
                </div>
              )}

              {/* Icon */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6 border transition-all duration-300 ${colorClasses.icon}`}>
                <i className={`${type.icon} text-2xl sm:text-3xl`}></i>
              </div>

              {/* Content */}
              <div className="mb-6">
                <h3 className={`text-xl sm:text-2xl font-medium mb-2 transition-colors duration-300 ${colorClasses.title}`}>
                  {type.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-4">
                  {type.subtitle}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {type.description}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {type.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-3 ${
                      type.color === 'indigo' 
                        ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30' 
                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                    }`}>
                      <i className={`ri-check-line text-xs ${
                        type.color === 'indigo' 
                          ? 'text-[#335FAD] dark:text-[#335FAD]' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}></i>
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="text-center">
        <button
          onClick={() => onTypeSelect(selectedType)}
          className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 hover:shadow-lg flex items-center space-x-3 mx-auto whitespace-nowrap cursor-pointer"
        >
          <span>Continuer</span>
          <i className="ri-arrow-right-line text-lg"></i>
        </button>
      </div>
    </div>
  );
}