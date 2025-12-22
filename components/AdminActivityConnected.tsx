'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ActivityReadStatusCache } from '@/lib/services/activity-read-status-cache';
import { getActivityConfig as getCentralizedActivityConfig } from '@/lib/utils/activity-config';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityItem {
  id: string;
  type: 'nouveau_dossier' | 'validation_devis' | 'finalisation' | 'devis_envoye' | 'devis_refuse' | 'modification_dossier';
  apporteurNom: string;
  apporteurPrenom: string;
  clientNom?: string;
  clientPrenom?: string;
  numeroDossier?: string;
  date: string;
  statut?: string;
  montant?: number;
  isRead?: boolean;
}

interface AdminActivityProps {
  limit?: number;
}

export default function AdminActivityConnected({ limit = 6 }: AdminActivityProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('tous');

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      // Récupérer les activités depuis la vue activities_view
      const { data: activitiesData, error } = await supabase
        .from('activities_view')
        .select(`
          id,
          activity_type,
          activity_title,
          activity_description,
          created_at,
          apporteur_nom,
          apporteur_prenom,
          client_nom,
          client_prenom,
          numero_dossier,
          dossier_statut,
          economie_generee,
          montant_capital,
          numero_devis,
          devis_statut
        `)
        .order('created_at', { ascending: false })
        .limit(limit || 50);

      if (error) {
        console.error('Erreur lors de la récupération des activités:', error);
        throw error;
      }

      // Transformer les données de la DB en format ActivityItem et fusionner avec cache
      const transformedActivities: ActivityItem[] = (activitiesData || []).map((activity: any) => {
        // Mapper les types d'activités de la DB vers les types du composant
        let type: ActivityItem['type'] = 'modification_dossier';
        
        switch (activity.activity_type) {
          case 'dossier_created':
            type = 'nouveau_dossier';
            break;
          case 'devis_envoye':
            type = 'devis_envoye';
            break;
          case 'devis_accepte':
            type = 'validation_devis';
            break;
          case 'devis_refuse':
            type = 'devis_refuse';
            break;
          case 'dossier_finalise':
            type = 'finalisation';
            break;
          // Types non affichés pour l'admin mais gérés pour éviter les erreurs
          case 'dossier_attribue':
          case 'dossier_supprime':
          case 'classement_updated':
            type = 'modification_dossier';
            break;
          default:
            type = 'modification_dossier';
        }

        // Fusionner avec le cache local
        const cachedStatus = ActivityReadStatusCache.getReadStatus(activity.id);
        const finalIsRead = cachedStatus !== null ? cachedStatus : (activity.is_read || false);

        return {
          id: activity.id,
          type,
          apporteurNom: activity.apporteur_nom || 'N/A',
          apporteurPrenom: activity.apporteur_prenom || 'N/A',
          clientNom: activity.client_nom,
          clientPrenom: activity.client_prenom,
          numeroDossier: activity.numero_dossier,
          date: activity.created_at,
          statut: activity.dossier_statut,
          montant: activity.economie_generee || activity.montant_capital,
          isRead: finalIsRead
        };
      });

      setActivities(transformedActivities);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
      // En cas d'erreur, utiliser des données vides plutôt que de planter
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Filtrer les activités selon le filtre sélectionné
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    if (filter !== 'tous') {
      filtered = activities.filter(activity => activity.type === filter);
    }
    
    return filtered.slice(0, limit);
  }, [activities, filter, limit]);

  // Configuration des types d'activité
  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'nouveau_dossier':
        return {
          icon: 'ri-file-add-line',
          color: 'text-[#335FAD] dark:text-[#335FAD]',
          bgColor: 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
          label: 'Nouveau dossier'
        };
      case 'devis_envoye':
        return {
          icon: 'ri-send-plane-line',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          label: 'Devis envoyé'
        };
      case 'validation_devis':
        return {
          icon: 'ri-checkbox-circle-line',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Devis accepté'
        };
      case 'devis_refuse':
        return {
          icon: 'ri-close-circle-line',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Devis refusé'
        };
      case 'finalisation':
        return {
          icon: 'ri-award-line',
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          label: 'Dossier finalisé'
        };
      default:
        return {
          icon: 'ri-edit-line',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          label: 'Modification'
        };
    }
  };

  // Formatage de date relative (spécifique aux activités)
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
  };

  const formatMontant = (montant?: number) => {
    if (!montant) return '';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant);
  };

  // Fonction pour marquer une activité comme lue (optimiste)
  const markActivityAsRead = (activityId: string) => {
    // Mise à jour optimiste immédiate
    setActivities(prev => prev.map(activity => 
      activity.id === activityId ? { ...activity, isRead: true } : activity
    ));
    
    // Ajouter au cache pour synchronisation en arrière-plan
    ActivityReadStatusCache.markAsReadOptimistic(activityId);
  };

  const handleActivityClick = async (activity: ActivityItem) => {
    // Naviguer vers le dossier
    if (activity.numeroDossier) {
      router.push(`/admin/dossiers/${activity.numeroDossier}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activité récente
          </h3>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Activité récente
        </h3>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="text-sm w-[180px]">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="nouveau_dossier">Nouveaux dossiers</SelectItem>
              <SelectItem value="devis_envoye">Devis envoyés</SelectItem>
              <SelectItem value="validation_devis">Devis acceptés</SelectItem>
              <SelectItem value="devis_refuse">Devis refusés</SelectItem>
              <SelectItem value="finalisation">Finalisations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={filter !== 'tous' ? 'ri-filter-off-line' : 'ri-history-line'}
          title={filter !== 'tous' ? 'Aucun résultat' : 'Pas encore d\'activité'}
          description={
            filter !== 'tous'
              ? 'Aucune activité ne correspond à ce filtre.'
              : 'Les actions de vos apporteurs apparaîtront ici.'
          }
          variant="compact"
        />
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const config = getActivityConfig(activity.type);
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                onMouseEnter={() => !activity.isRead && markActivityAsRead(activity.id)}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <i className={`${config.icon} ${config.color} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {config.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeDate(activity.date)}
                    </p>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">
                        {activity.apporteurPrenom} {activity.apporteurNom}
                      </span>
                      {activity.clientNom && activity.clientPrenom && (
                        <>
                          {' '}pour{' '}
                          <span className="font-medium">
                            {activity.clientPrenom} {activity.clientNom}
                          </span>
                        </>
                      )}
                    </p>
                    {activity.numeroDossier && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Dossier {activity.numeroDossier}
                      </p>
                    )}
                    {activity.montant && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                        {formatMontant(activity.montant)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-center">
        <Link
          href="/admin/activites"
          className="text-sm text-[#335FAD] hover:text-[#2a4d8a] dark:text-[#335FAD] dark:hover:text-[#2a4d8a] font-medium"
        >
          Tout voir
        </Link>
      </div>
    </div>
  );
}
