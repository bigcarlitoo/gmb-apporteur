
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ActivitiesService } from '@/lib/services/activities';

// Interface pour les activités depuis Supabase
interface Activity {
  id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string;
  activity_data?: any;
  created_at: string;
  is_read: boolean;
  dossier_id?: string;
  user_id?: string;
  // Données formatées pour l'affichage
  type?: 'success' | 'info' | 'warning' | 'error';
  amount?: string;
  status?: string;
  time?: string;
  icon?: string;
  client_name?: string;
  dossier_number?: string;
}

interface ApporteurActivityProps {
  userId: string;
}

export default function ApporteurActivity({ userId }: ApporteurActivityProps) {
  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Navigation vers la page activités complète
  const handleViewAll = () => {
    router.push('/activites');
  };

  // Navigation vers le détail d'un dossier
  const handleActivityClick = (activity: Activity) => {
    if (activity.dossier_id) {
      router.push(`/dossier/${activity.dossier_id}`);
    }
  };

  // Fonction pour récupérer les activités depuis Supabase
  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 fetchActivities - User ID:', userId);
      
      const data = await ActivitiesService.getActivitiesByUserId(userId);
      console.log('📊 fetchActivities - Données récupérées:', data?.length);
      
      // Formater les données pour l'affichage
      const formattedActivities = data?.map(activity => formatActivityForDisplay(activity)) || [];
      setActivities(formattedActivities);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des activités:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour actualiser les activités
  const refreshActivities = async () => {
    await fetchActivities();
  };

  // Fonction pour formater une activité pour l'affichage
  const formatActivityForDisplay = (activity: any): Activity => {
    const activityData = activity.activity_data || {};
    
    // Déterminer le type et l'icône selon le type d'activité
    let type: 'success' | 'info' | 'warning' | 'error' = 'info';
    let icon = 'ri-file-line';
    let amount = '';
    let status = '';
    
    switch (activity.activity_type) {
      case 'dossier_finalise':
        type = 'success';
        icon = 'ri-checkbox-circle-line';
        amount = activityData.economie_generee ? `Économie : ${Number(activityData.economie_generee).toLocaleString()}€` : '';
        break;
      case 'devis_accepte':
        type = 'success';
        icon = 'ri-check-double-line';
        amount = activityData.economie_generee ? `Économie : ${Number(activityData.economie_generee).toLocaleString()}€` : '';
        break;
      case 'devis_envoye':
        type = 'info';
        icon = 'ri-send-plane-line';
        status = 'En cours de traitement';
        break;
      case 'dossier_created':
        type = 'info';
        icon = 'ri-file-add-line';
        status = 'Nouveau';
        break;
      case 'dossier_updated':
        type = 'warning';
        icon = 'ri-edit-line';
        status = 'Mis à jour';
        break;
      default:
        type = 'info';
        icon = 'ri-file-line';
    }

    return {
      ...activity,
      type,
      icon,
      amount,
      status,
      time: formatTimeAgo(activity.created_at),
      client_name: activityData.client_prenom && activityData.client_nom 
        ? `${activityData.client_prenom} ${activityData.client_nom}`
        : undefined,
      dossier_number: activityData.numero_dossier
    };
  };

  // Fonction utilitaire pour formater le temps écoulé
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes}min`;
    } else if (diffInMinutes < 1440) { // 24 heures
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else if (diffInMinutes < 2880) { // 48 heures
      return 'Hier';
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} jours`;
    }
  };

  useEffect(() => {
    // Charger les activités au montage du composant
    fetchActivities();

    // TODO: Configurer l'écoute en temps réel des nouvelles activités
    // const subscription = ActivitiesService.subscribeToActivities(userId, (payload) => {
    //   const newActivity = formatActivityForDisplay(payload.new);
    //   setActivities(prev => [newActivity, ...prev]);
    // });
    // 
    // return () => {
    //   ActivitiesService.unsubscribeFromActivities(subscription);
    // };
  }, [userId]);

  const getActivityStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          icon: 'text-green-600 dark:text-green-400',
          border: 'border-green-200 dark:border-green-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          icon: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-700'
        };
      case 'info':
        return {
          bg: 'bg-[#335FAD]/5 dark:bg-[#335FAD]/20',
          icon: 'text-[#335FAD] dark:text-[#335FAD]',
          border: 'border-[#335FAD]/20 dark:border-[#335FAD]/70'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          icon: 'text-red-600 dark:text-red-400',
          border: 'border-red-200 dark:border-red-700'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-700',
          icon: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-600'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border-2 border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white">Activité récente</h2>
          <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm font-medium mt-1">Suivi de vos dossiers</p>
        </div>
        <button 
          onClick={handleViewAll}
          className="text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 dark:hover:text-[#335FAD]/80 text-sm font-medium cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          Tout voir
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] dark:border-[#335FAD]"></div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {activities.map((activity) => {
            const styles = getActivityStyles(activity.type);
            
            return (
              <div key={activity.id} className="group">
                <div 
                  className={`flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200 border border-gray-100 dark:border-gray-700 ${activity.dossier_number ? 'cursor-pointer' : ''}`}
                  onClick={() => handleActivityClick(activity)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${styles.bg} ${styles.border} border rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <i className={`${activity.icon} ${styles.icon} text-base sm:text-lg`}></i>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 lg:block">
                          <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base flex-1">
                            {activity.activity_title}
                          </p>
                          {/* Date - Mobile: à côté du titre, Desktop: au-dessus du badge */}
                          <p className="text-gray-400 dark:text-gray-500 text-xs font-medium flex-shrink-0 lg:hidden">
                            {activity.time}
                          </p>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1 break-words">
                          {activity.activity_description}
                        </p>
                      </div>
                      
                      {/* Status/Amount et Date - Desktop: colonne droite */}
                      <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:items-end gap-2">
                        {/* Date - Desktop: au-dessus du badge */}
                        <p className="text-gray-400 dark:text-gray-500 text-xs font-medium hidden lg:block text-right">
                          {activity.time}
                        </p>
                        
                        {activity.amount && (
                          <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 w-full sm:w-auto justify-center sm:justify-start">
                            {activity.amount}
                          </span>
                        )}
                        {activity.status && (
                          <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border border-[#335FAD]/20 dark:border-[#335FAD]/70 w-full sm:w-auto justify-center sm:justify-start">
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center">
          <button 
            onClick={refreshActivities}
            disabled={isLoading}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <i className={`ri-refresh-line mr-2 ${isLoading ? 'animate-spin' : ''}`}></i>
            {isLoading ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>
      </div>
    </div>
  );
}
