
'use client';

import { useState, useEffect } from 'react';
import { ApporteursService } from '@/lib/services/apporteurs';

// TODO: SUPABASE INTEGRATION
// Interface pour les données utilisateur
interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour les statistiques utilisateur
interface UserStats {
  dossiersEnvoyes: number;
  economiesGenerees: number;
  classement: number;
  totalApporteurs: number;
  progressionDossiers: number;
  progressionEconomies: number;
  progressionClassement: string;
}

// Interface pour les données de classement depuis Supabase
interface RankingData {
  id: string;
  rank: number;
  firstName: string;
  lastName: string;
  initials: string;
  dossiers: number;
  economies: number;
  economiesFormatted: string;
  isUp: boolean;
  isMe: boolean;
  progressionVersNext?: number; // Pour calculer la progression vers le rang supérieur
}

interface ApporteurRankingProps {
  userData: UserData;
  userStats: UserStats;
}

export default function ApporteurRanking({ userData, userStats }: ApporteurRankingProps) {
  const [rankings, setRankings] = useState<RankingData[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  
  // Calculer la progression vers le rang supérieur
  const currentUser = rankings.find(r => r.isMe);
  const nextRankUser = rankings.find(r => r.rank === userStats.classement - 1);
  const progressionAmount = nextRankUser ? nextRankUser.economies - userStats.economiesGenerees : 0;
  const progressionPercentage = nextRankUser ? (userStats.economiesGenerees / nextRankUser.economies) * 100 : 100;
  
  // La barre ne s'affiche que si l'utilisateur n'est pas premier
  const showProgressionBar = userStats.classement > 1 && nextRankUser;

  // Fonction pour récupérer le classement depuis Supabase
  const fetchRanking = async () => {
    setIsLoading(true);
    try {
      console.log('🏆 fetchRanking - Récupération du classement');
      
      const rankingData = await ApporteursService.getFullRanking();
      console.log('📊 fetchRanking - Données récupérées:', rankingData?.length);
      
      // Formater les données pour l'affichage
      const formattedRankings = rankingData?.map((apporteur: any) => ({
        id: apporteur.apporteur_id,
        rank: Number(apporteur.classement),
        firstName: apporteur.prenom,
        lastName: apporteur.nom,
        initials: `${apporteur.prenom.charAt(0)}${apporteur.nom.charAt(0)}`,
        dossiers: Number(apporteur.total_dossiers),
        economies: Number(apporteur.total_economies),
        economiesFormatted: `${Number(apporteur.total_economies).toLocaleString()} €`,
        isUp: Number(apporteur.progression_economies) > 0,
        isMe: apporteur.apporteur_id === userData.id
      })) || [];
      
      setRankings(formattedRankings);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du classement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les statistiques de progression
  const fetchProgressionStats = async () => {
    try {
      // const { data, error } = await supabase
      //   .rpc('calculate_user_progression', { 
      //     user_id: userData.id,
      //     current_rank: userStats.classement 
      //   });
      // 
      // if (error) throw error;
      // return data;
    } catch (error) {
      console.error('Erreur lors du calcul de la progression:', error);
      return null;
    }
  };

  useEffect(() => {
    // Charger le classement au montage du composant
    fetchRanking();
    
    // TODO: Configurer l'écoute en temps réel des changements de classement
    // const subscription = supabase
    //   .channel('rankings')
    //   .on('postgres_changes', 
    //     { 
    //       event: '*', 
    //       schema: 'public', 
    //       table: 'dossiers'
    //     }, 
    //     () => {
    //       fetchRanking(); // Recharger le classement si les dossiers changent
    //     }
    //   )
    //   .subscribe();
    // 
    // return () => {
    //   subscription.unsubscribe();
    // };
  }, [userData.id, userStats]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white">Classement du mois</h2>
          <p className="text-[#335FAD] dark:text-[#335FAD] text-sm font-medium mt-1 bg-[#335FAD]/5 dark:bg-[#335FAD]/30 px-3 py-1 rounded-full border border-[#335FAD]/20 dark:border-[#335FAD]/70 inline-block">
            {new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Votre progression - Affichage conditionnel */}
      {showProgressionBar ? (
        <div className="mb-6 sm:mb-8">
          <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-2xl p-4 sm:p-6 border-2 border-[#335FAD]/20 dark:border-[#335FAD]/70">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Votre progression</h3>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#335FAD] dark:text-[#335FAD]">
                  {progressionAmount.toLocaleString()} €
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  pour le #{userStats.classement - 1}
                </p>
              </div>
            </div>
            
            {/* Barre de progression avec positions */}
            <div className="space-y-2">
              {/* Positions */}
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">#{userStats.classement}</span>
                <span className="font-medium">#{userStats.classement - 1}</span>
              </div>
              
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 relative">
                <div 
                  className="bg-[#335FAD] dark:bg-[#335FAD] h-3 rounded-full transition-all duration-500 ease-out relative" 
                  style={{ width: `${Math.min(progressionPercentage, 100)}%` }}
                >
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></div>
                </div>
                
                {/* Indicateur de position actuelle */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-2 h-5 bg-white dark:bg-gray-800 border border-[#335FAD] rounded-full shadow-sm"
                  style={{ left: `${Math.min(progressionPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : userStats.classement === 1 ? (
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-4 sm:p-6 border-2 border-amber-200 dark:border-amber-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center aspect-square">
                <i className="ri-trophy-line text-amber-600 dark:text-amber-400 text-xl"></i>
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">🏆 Vous êtes en tête !</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Félicitations, vous êtes le meilleur apporteur ce mois-ci avec {userStats.economiesGenerees.toLocaleString()}€ d'économies générées.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Top 5 */}
      <div className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#335FAD] dark:border-[#335FAD]"></div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {rankings.map((person) => (
              <div key={person.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors duration-200 ${
                person.isMe 
                  ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border-[#335FAD]/20 dark:border-[#335FAD]/70' 
                  : 'bg-gray-50/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100/50 dark:hover:bg-gray-600/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                    person.rank === 1 
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' 
                      : person.rank === 2 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' 
                      : person.rank === 3 
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}>
                    {person.rank}
                  </div>
                  
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${person.isMe ? 'text-[#335FAD] dark:text-[#335FAD]' : 'text-gray-900 dark:text-white'}`}>
                      {person.firstName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {person.dossiers} dossiers
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center space-x-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                      Économies générées
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {person.economiesFormatted}
                    </p>
                    <div className="flex items-center justify-end mt-1">
                      <i className={`text-xs ${person.isUp ? 'ri-arrow-up-line text-green-500' : 'ri-arrow-down-line text-red-500'}`}></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton supprimé selon la demande: pas d'action 'Actualiser' */}
    </div>
  );
}
