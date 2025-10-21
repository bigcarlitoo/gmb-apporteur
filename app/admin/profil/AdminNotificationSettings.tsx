'use client';

import { useState } from 'react';

interface AdminNotificationPreferences {
  newApporteur: {
    email: boolean;
    app: boolean;
  };
  dossierSubmitted: {
    email: boolean;
    app: boolean;
  };
  supportRequest: {
    email: boolean;
    app: boolean;
  };
  systemAlerts: {
    email: boolean;
    app: boolean;
  };
  monthlyReport: {
    email: boolean;
    app: boolean;
  };
}

interface AdminNotificationSettingsProps {
  preferences: AdminNotificationPreferences;
  onSave: (preferences: AdminNotificationPreferences) => Promise<{ success: boolean; error?: string }>;
}

export default function AdminNotificationSettings({ preferences, onSave }: AdminNotificationSettingsProps) {
  const [localPreferences, setLocalPreferences] = useState<AdminNotificationPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configuration des types de notifications administrateur
  const notificationTypes = [
    {
      key: 'newApporteur' as keyof AdminNotificationPreferences,
      title: 'Nouvel apporteur inscrit',
      description: 'Soyez averti quand un nouvel apporteur rejoint la plateforme',
      category: 'Essentiel',
      categoryColor: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      icon: 'ri-user-add-line',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      key: 'dossierSubmitted' as keyof AdminNotificationPreferences,
      title: 'Nouveau dossier soumis',
      description: 'Recevez une alerte pour chaque nouveau dossier à traiter',
      category: 'Essentiel',
      categoryColor: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      icon: 'ri-file-add-line',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      key: 'supportRequest' as keyof AdminNotificationPreferences,
      title: 'Demande de support apporteur',
      description: 'Soyez notifié des demandes d\'aide des apporteurs',
      category: 'Recommandé',
      categoryColor: 'text-[#335FAD] dark:text-[#335FAD] bg-[#335FAD]/10 dark:bg-[#335FAD]/30',
      icon: 'ri-customer-service-line',
      iconColor: 'text-[#335FAD] dark:text-[#335FAD]'
    },
    {
      key: 'systemAlerts' as keyof AdminNotificationPreferences,
      title: 'Alertes système et sécurité',
      description: 'Notifications critiques sur l\'état du système',
      category: 'Critique',
      categoryColor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
      icon: 'ri-alarm-warning-line',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      key: 'monthlyReport' as keyof AdminNotificationPreferences,
      title: 'Rapport mensuel automatique',
      description: 'Recevez le rapport d\'activité mensuel par email',
      category: 'Optionnel',
      categoryColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
      icon: 'ri-file-chart-line',
      iconColor: 'text-amber-600 dark:text-amber-400'
    }
  ];

  // Mettre à jour une préférence
  const updatePreference = (key: keyof AdminNotificationPreferences, channel: 'email' | 'app', value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: value
      }
    }));
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await onSave(localPreferences);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Préférences administrateur mises à jour avec succès' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des préférences' });
    } finally {
      setIsSaving(false);
    }
  };

  // Vérifier s'il y a des changements
  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(localPreferences);

  // Masquer le message après 5 secondes
  useState(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  });

  return (
    <div className="space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-400'
        }`}>
          <i className={`${message.type === 'success' ? 'ri-check-circle-line' : 'ri-error-warning-line'} text-lg`}></i>
          <span className="font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      {/* Section principale */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="ri-notification-badge-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Notifications Administrateur
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Contrôlez les alertes système et de gestion
              </p>
            </div>
          </div>
        </div>

        {/* Alerte d'information */}
        <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/70 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-lg flex items-center justify-center mt-0.5">
              <i className="ri-shield-check-line text-[#335FAD] dark:text-[#335FAD] text-sm"></i>
            </div>
            <div>
              <h4 className="font-medium text-[#335FAD] dark:text-[#335FAD] mb-1">
                Notifications Administrateur
              </h4>
              <p className="text-[#335FAD]/80 dark:text-[#335FAD]/80 text-sm">
                En tant qu'administrateur, vous recevez des notifications spécifiques pour la gestion de la plateforme, 
                le support des apporteurs et la surveillance système. Configurez ces alertes selon vos besoins de supervision.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="space-y-6">
          {notificationTypes.map((notif) => {
            const pref = localPreferences[notif.key];
            
            return (
              <div key={notif.key} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Icône */}
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className={`${notif.icon} ${notif.iconColor} text-lg`}></i>
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {notif.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${notif.categoryColor}`}>
                        {notif.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {notif.description}
                    </p>
                    
                    {/* Options de notification */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Email */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.email}
                          onChange={(e) => updatePreference(notif.key, 'email', e.target.checked)}
                          className="w-4 h-4 text-[#335FAD] bg-gray-100 border-gray-300 rounded focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex items-center space-x-2">
                          <i className="ri-mail-line text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Par email</span>
                        </div>
                      </label>
                      
                      {/* Application */}
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pref.app}
                          onChange={(e) => updatePreference(notif.key, 'app', e.target.checked)}
                          className="w-4 h-4 text-[#335FAD] bg-gray-100 border-gray-300 rounded focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex items-center space-x-2">
                          <i className="ri-smartphone-line text-gray-500 dark:text-gray-400"></i>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dans l'app</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {hasChanges && (
          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  <span>Sauvegarder les préférences</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Résumé des notifications activées */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
          <i className="ri-dashboard-line mr-2 text-[#335FAD] dark:text-[#335FAD]/80"></i>
          Tableau de bord des notifications
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {/* Notifications par email */}
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <i className="ri-mail-line mr-2"></i>
              Par email ({Object.values(localPreferences).filter(p => p.email).length})
            </p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {notificationTypes.filter(notif => localPreferences[notif.key].email).map(notif => (
                <li key={`${notif.key}-email`} className="flex items-center">
                  <i className="ri-check-line mr-2 text-green-500 text-xs"></i>
                  <span className="truncate">{notif.title}</span>
                </li>
              ))}
              {Object.values(localPreferences).filter(p => p.email).length === 0 && (
                <li className="text-gray-500 dark:text-gray-500 italic">Aucune notification par email</li>
              )}
            </ul>
          </div>
          
          {/* Notifications dans l'app */}
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <i className="ri-smartphone-line mr-2"></i>
              Dans l'app ({Object.values(localPreferences).filter(p => p.app).length})
            </p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {notificationTypes.filter(notif => localPreferences[notif.key].app).map(notif => (
                <li key={`${notif.key}-app`} className="flex items-center">
                  <i className="ri-check-line mr-2 text-green-500 text-xs"></i>
                  <span className="truncate">{notif.title}</span>
                </li>
              ))}
              {Object.values(localPreferences).filter(p => p.app).length === 0 && (
                <li className="text-gray-500 dark:text-gray-500 italic">Aucune notification dans l'app</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Informations sur les notifications système */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mt-0.5">
            <i className="ri-information-line text-amber-600 dark:text-amber-400 text-sm"></i>
          </div>
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-1">
              Recommandations de notification
            </h4>
            <ul className="text-amber-700 dark:text-amber-300 text-sm space-y-1">
              <li>• <strong>Alertes système :</strong> Recommandé de garder activé pour la sécurité</li>
              <li>• <strong>Support apporteur :</strong> Important pour maintenir la qualité de service</li>
              <li>• <strong>Nouveaux dossiers :</strong> Essentiel pour la réactivité de traitement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}