'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActivitiesService } from '@/lib/services/activities';
import { ActivityReadStatusCache } from '@/lib/services/activity-read-status-cache';
import ActivityCard from './ActivityCard';
import { getActivityConfig } from '@/lib/utils/activity-config';

interface ActivityItem {
  id: string;
  type: 'nouveau_dossier' | 'validation_devis' | 'refus_devis' | 'finalisation' | 'nouveau_apporteur' | 'modification_dossier';
  apporteurNom: string;
  apporteurPrenom: string;
  clientNom?: string;
  clientPrenom?: string;
  numeroDossier?: string;
  date: string;
  statut?: string;
  montant?: number;
}

interface AdminActivityProps {
  // Props pour filtrer les activités si nécessaire
  limit?: number;
}

export default function AdminActivity({ limit = 10 }: AdminActivityProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('tous');

  // TODO: SUPABASE INTEGRATION - Récupérer les activités depuis la base de données
  // Cette fonction devra être remplacée par une vraie requête Supabase qui récupère :
  // 1. Les nouveaux dossiers créés (table: dossiers) avec jointure sur client_infos et apporteur_profiles
  // 2. Les validations/refus de devis (table: devis_history ou process_steps)
  // 3. Les finalisations de dossiers (table: dossiers avec statut 'finalise')
  // 4. Les nouveaux apporteurs inscrits (table: apporteur_profiles)
  // 5. Les modifications de dossiers (table: dossier_history ou audit_log)
  //
  // Query suggérée :
  // const { data: activitiesData, error } = await supabase
  //   .from('activities_view') // Vue SQL combinant toutes les activités
  //   .select(`
  //     id,
  //     type,
  //     created_at,
  //     apporteur_profiles!inner(nom, prenom),
  //     client_infos(nom, prenom),
  //     dossiers(numero_dossier, statut),
  //     montant,
  //     metadata
  //   `)
  //   .order('created_at', { ascending: false })
  //   .limit(limit || 50);
  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      // Simulation temporaire - À remplacer par l'appel Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: SUPABASE - Ces données mockées représentent tous les types d'activités
      // que la base de données devra pouvoir fournir :
      const mockActivities: ActivityItem[] = [
        // ACTIVITÉ TYPE 1: nouveau_dossier
        // Source DB: table 'dossiers' avec created_at récent + jointures
        // Trigger: INSERT sur table dossiers avec is_draft = false
        {
          id: '1',
          type: 'nouveau_dossier',
          apporteurNom: 'Dubois',
          apporteurPrenom: 'Marie',
          clientNom: 'Martin',
          clientPrenom: 'Pierre',
          numeroDossier: 'DOS123456',
          date: '2024-01-22T10:30:00Z',
          statut: 'en_attente'
        },
        // ACTIVITÉ TYPE 2: validation_devis
        // Source DB: table 'process_steps' ou 'devis_history' avec action = 'validated'
        // Trigger: UPDATE sur process_steps avec step_name = 'devis' et status = 'completed'
        {
          id: '2',
          type: 'validation_devis',
          apporteurNom: 'Lambert',
          apporteurPrenom: 'Thomas',
          clientNom: 'Durand',
          clientPrenom: 'Sophie',
          numeroDossier: 'DOS789012',
          date: '2024-01-22T09:45:00Z',
          montant: 4250 // économies réalisées ou montant du prêt
        },
        // ACTIVITÉ TYPE 3: refus_devis
        // Source DB: table 'process_steps' ou 'devis_history' avec action = 'rejected'
        // Trigger: UPDATE sur process_steps avec step_name = 'devis' et status = 'rejected'
        {
          id: '3',
          type: 'refus_devis',
          apporteurNom: 'Bernard',
          apporteurPrenom: 'Claire',
          clientNom: 'Leroy',
          clientPrenom: 'Antoine',
          numeroDossier: 'DOS345678',
          date: '2024-01-22T08:20:00Z'
        },
        // ACTIVITÉ TYPE 4: nouveau_apporteur
        // Source DB: table 'apporteur_profiles' avec created_at récent
        // Trigger: INSERT sur table apporteur_profiles
        {
          id: '4',
          type: 'nouveau_apporteur',
          apporteurNom: 'Moreau',
          apporteurPrenom: 'Julien',
          date: '2024-01-22T07:15:00Z'
        },
        // ACTIVITÉ TYPE 5: finalisation
        // Source DB: table 'dossiers' avec statut = 'finalise' et updated_at récent
        // Trigger: UPDATE sur dossiers avec statut changé vers 'finalise'
        {
          id: '5',
          type: 'finalisation',
          apporteurNom: 'Roux',
          apporteurPrenom: 'Emma',
          clientNom: 'Garcia',
          clientPrenom: 'Luis',
          numeroDossier: 'DOS567890',
          date: '2024-01-21T16:30:00Z',
          montant: 6780 // montant de la commission ou économies
        },
        // ACTIVITÉ TYPE 6: modification_dossier
        // Source DB: table 'dossier_history' ou audit trail
        // Trigger: UPDATE significatif sur dossiers ou client_infos
        {
          id: '6',
          type: 'modification_dossier',
          apporteurNom: 'Petit',
          apporteurPrenom: 'Lucas',
          clientNom: 'Robert',
          clientPrenom: 'Marie',
          numeroDossier: 'DOS234567',
          date: '2024-01-21T14:45:00Z'
        },
        {
          id: '7',
          type: 'nouveau_dossier',
          apporteurNom: 'Girard',
          apporteurPrenom: 'Alice',
          clientNom: 'Bonnet',
          clientPrenom: 'Jean',
          numeroDossier: 'DOS678901',
          date: '2024-01-21T11:20:00Z',
          statut: 'en_cours'
        },
        {
          id: '8',
          type: 'validation_devis',
          apporteurNom: 'Rousseau',
          apporteurPrenom: 'Paul',
          clientNom: 'Vincent',
          clientPrenom: 'Laura',
          numeroDossier: 'DOS789123',
          date: '2024-01-21T09:10:00Z',
          montant: 3890
        }
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
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

  // ✅ Utilisation de la configuration centralisée depuis lib/utils/activity-config.ts

  // Générer le message d'activité
  const getActivityMessage = (activity: ActivityItem) => {
    const config = getActivityConfig(activity.type);
    
    switch (activity.type) {
      case 'nouveau_dossier':
        return (
          <div>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> a soumis un nouveau dossier pour </span>
            <span className="font-medium">{activity.clientPrenom} {activity.clientNom}</span>
          </div>
        );
      case 'validation_devis':
        return (
          <div>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> a validé le devis pour </span>
            <span className="font-medium">{activity.clientPrenom} {activity.clientNom}</span>
            {activity.montant && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {' '}({formatAmount(activity.montant)})
              </span>
            )}
          </div>
        );
      case 'refus_devis':
        return (
          <div>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> a refusé le devis pour </span>
            <span className="font-medium">{activity.clientPrenom} {activity.clientNom}</span>
          </div>
        );
      case 'finalisation':
        return (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Dossier finalisé pour </span>
            <span className="font-medium">{activity.clientPrenom} {activity.clientNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> par </span>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            {activity.montant && (
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {' '}({formatAmount(activity.montant)})
              </span>
            )}
          </div>
        );
      case 'nouveau_apporteur':
        return (
          <div>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> a rejoint la plateforme</span>
          </div>
        );
      case 'modification_dossier':
        return (
          <div>
            <span className="font-medium">{activity.apporteurPrenom} {activity.apporteurNom}</span>
            <span className="text-gray-600 dark:text-gray-400"> a modifié le dossier de </span>
            <span className="font-medium">{activity.clientPrenom} {activity.clientNom}</span>
          </div>
        );
      default:
        return <span>Activité inconnue</span>;
    }
  };

  // Formatage des dates (même format que ApporteurActivity)
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

  // Formatage des montants
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Navigation vers le détail d'un dossier
  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.numeroDossier) {
      // TODO: SUPABASE - Vérifier que l'admin a accès à ce dossier
      router.push(`/admin/dossiers/${activity.numeroDossier}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-light text-gray-900 dark:text-white flex items-center">
          <i className="ri-pulse-line mr-3 text-[#335FAD] dark:text-[#335FAD]"></i>
          Activité récente
        </h2>
        <Link
          href="/admin/activites"
          className="text-[#335FAD] dark:text-[#335FAD] hover:text-[#335FAD]/80 dark:hover:text-[#335FAD]/80 text-sm font-medium cursor-pointer"
        >
          Tout voir
        </Link>
      </div>

      {/* Filtres sur une ligne scrollable */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('tous')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'tous'
                ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('nouveau_dossier')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'nouveau_dossier'
                ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Nouveaux
          </button>
          <button
            onClick={() => setFilter('validation_devis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'validation_devis'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Validations
          </button>
          <button
            onClick={() => setFilter('refus_devis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'refus_devis'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Refus
          </button>
          <button
            onClick={() => setFilter('finalisation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'finalisation'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Finalisés
          </button>
          <button
            onClick={() => setFilter('nouveau_apporteur')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'nouveau_apporteur'
                ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD]'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Apporteurs
          </button>
          <button
            onClick={() => setFilter('modification_dossier')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
              filter === 'modification_dossier'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Modifications
          </button>
        </div>
      </div>

      {/* Liste des activités */}
      <div className="space-y-3 sm:space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-pulse-line text-gray-400 dark:text-gray-500 text-2xl"></i>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Aucune activité récente</p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const config = getActivityConfig(activity.type);
            
            return (
              <div key={activity.id} className="group">
                <div 
                  className={`flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200 border border-gray-100 dark:border-gray-700 ${activity.numeroDossier ? 'cursor-pointer' : ''}`}
                  onClick={() => handleActivityClick(activity)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${config.bgColor} border border-gray-200 dark:border-gray-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <i className={`${config.icon} ${config.color} text-base sm:text-lg`}></i>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 lg:block">
                          <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base flex-1">
                            {getActivityMessage(activity)}
                          </p>
                          {/* Date - Mobile: à côté du titre, Desktop: au-dessus du badge */}
                          <p className="text-gray-400 dark:text-gray-500 text-xs font-medium flex-shrink-0 lg:hidden">
                            {formatTimeAgo(activity.date)}
                          </p>
                        </div>
                        {activity.numeroDossier && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1 break-words">
                            {activity.numeroDossier}
                          </p>
                        )}
                      </div>
                      
                      {/* Status/Amount et Date - Desktop: colonne droite */}
                      <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:items-end gap-2">
                        {/* Date - Desktop: au-dessus du badge */}
                        <p className="text-gray-400 dark:text-gray-500 text-xs font-medium hidden lg:block text-right">
                          {formatTimeAgo(activity.date)}
                        </p>
                        
                        {activity.montant && (
                          <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 w-full sm:w-auto justify-center sm:justify-start">
                            {formatAmount(activity.montant)}
                          </span>
                        )}
                        {activity.statut && (
                          <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#335FAD]/10 dark:bg-[#335FAD]/30 text-[#335FAD] dark:text-[#335FAD] border border-[#335FAD]/20 dark:border-[#335FAD]/70 w-full sm:w-auto justify-center sm:justify-start">
                            {activity.statut}
                          </span>
                        )}
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

// TODO: SUPABASE INTEGRATION - Structure de base de données recommandée
// 
// 1. TABLE: activities_log
//    - id (uuid, primary key)
//    - type (enum: 'nouveau_dossier', 'validation_devis', 'refus_devis', 'finalisation', 'nouveau_apporteur', 'modification_dossier')
//    - user_id (uuid, référence vers apporteur_profiles ou admin_users)
//    - dossier_id (uuid, référence vers dossiers, nullable pour nouveau_apporteur)
//    - client_id (uuid, référence vers client_infos, nullable)
//    - metadata (jsonb, pour stocker des infos supplémentaires comme montant, ancien_statut, etc.)
//    - created_at (timestamp)
//
// 2. TRIGGERS SQL à créer :
//    - ON INSERT dossiers (is_draft = false) -> INSERT activities_log (type = 'nouveau_dossier')
//    - ON UPDATE dossiers (statut vers 'finalise') -> INSERT activities_log (type = 'finalisation')
//    - ON INSERT apporteur_profiles -> INSERT activities_log (type = 'nouveau_apporteur')
//    - ON UPDATE process_steps (devis validé/refusé) -> INSERT activities_log (type = 'validation_devis'/'refus_devis')
//    - ON UPDATE dossiers/client_infos (modifications significatives) -> INSERT activities_log (type = 'modification_dossier')
//
// 3. VUE SQL recommandée : activities_view
//    SELECT 
//      al.id,
//      al.type,
//      al.created_at,
//      ap.nom as apporteur_nom,
//      ap.prenom as apporteur_prenom,
//      ci.nom as client_nom,
//      ci.prenom as client_prenom,
//      d.numero_dossier,
//      d.statut,
//      al.metadata->>'montant' as montant
//    FROM activities_log al
//    LEFT JOIN apporteur_profiles ap ON al.user_id = ap.user_id
//    LEFT JOIN dossiers d ON al.dossier_id = d.id
//    LEFT JOIN client_infos ci ON al.client_id = ci.id
//    ORDER BY al.created_at DESC;
