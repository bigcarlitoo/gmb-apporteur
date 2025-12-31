'use client';

import { useState } from 'react';

interface CabinetInfo {
  broker_id: string;
  broker_name: string;
  owner_name?: string;
  joined_at?: string;
}

interface CabinetSectionProps {
  cabinetInfo: CabinetInfo | null;
  loading: boolean;
  onLeaveCabinet: () => Promise<{ success: boolean; error?: string }>;
}

export default function CabinetSection({ cabinetInfo, loading, onLeaveCabinet }: CabinetSectionProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleLeave = async () => {
    if (confirmText !== 'QUITTER') {
      setError('Veuillez taper QUITTER pour confirmer');
      return;
    }

    setIsLeaving(true);
    setError('');

    try {
      const result = await onLeaveCabinet();
      if (!result.success) {
        setError(result.error || 'Une erreur est survenue');
      } else {
        // Redirection vers la page de connexion ou confirmation
        window.location.href = '/connexion';
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cabinetInfo) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Mon Cabinet
        </h2>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
              <i className="ri-building-line text-amber-600 dark:text-amber-400 text-xl"></i>
            </div>
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                Aucun cabinet associé
              </h3>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                Vous n'êtes actuellement rattaché à aucun cabinet de courtage. 
                Demandez un lien d'invitation à votre courtier pour rejoindre son cabinet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Mon Cabinet
      </h2>

      {/* Cabinet Info Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="w-14 h-14 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
              <i className="ri-building-2-line text-[#335FAD] text-2xl"></i>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {cabinetInfo.broker_name}
              </h3>
              {cabinetInfo.owner_name && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Dirigé par {cabinetInfo.owner_name}
                </p>
              )}
              {cabinetInfo.joined_at && (
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  <i className="ri-calendar-line mr-1"></i>
                  Membre depuis le {new Date(cabinetInfo.joined_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-green-700 dark:text-green-400 text-sm font-medium">Actif</span>
          </div>
        </div>
      </div>

      {/* Leave Cabinet Section */}
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-6">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
            <i className="ri-logout-box-r-line text-red-600 dark:text-red-400 text-lg"></i>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">
              Quitter le cabinet
            </h3>
            <p className="text-red-700 dark:text-red-400 text-sm mb-4">
              En quittant ce cabinet, votre compte sera désactivé et vous ne pourrez plus accéder 
              à vos dossiers. Cette action est irréversible.
            </p>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Quitter le cabinet
            </button>
          </div>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-alert-line text-red-600 dark:text-red-400 text-3xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Confirmer le départ
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Vous êtes sur le point de quitter le cabinet <strong>{cabinetInfo.broker_name}</strong>.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                  <i className="ri-error-warning-line mr-2"></i>
                  Conséquences :
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  <li>• Votre compte sera désactivé immédiatement</li>
                  <li>• Vous perdrez l'accès à tous vos dossiers</li>
                  <li>• Vos commissions en attente seront perdues</li>
                  <li>• Cette action est irréversible</li>
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tapez <strong>QUITTER</strong> pour confirmer
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="QUITTER"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setConfirmText('');
                    setError('');
                  }}
                  disabled={isLeaving}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleLeave}
                  disabled={isLeaving || confirmText !== 'QUITTER'}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLeaving ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Départ en cours...
                    </>
                  ) : (
                    'Confirmer le départ'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}









