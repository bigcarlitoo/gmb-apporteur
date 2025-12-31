'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils/formatters';

interface PendingValidation {
  dossier_id: string;
  numero_dossier: string;
  client_nom: string;
  client_prenom: string;
  apporteur_amount: number;
  finalized_at: string;
  validation_due_at: string;
  days_overdue: number;
}

interface BlockingStatus {
  is_blocked: boolean;
  pending_count: number;
  overdue_count: number;
  blocked_reason?: string;
  blocked_at?: string;
}

interface BrokerBlockingModalProps {
  brokerId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Si true, l'utilisateur ne peut pas fermer la modale */
  cannotClose?: boolean;
}

export function BrokerBlockingModal({ 
  brokerId, 
  isOpen, 
  onClose,
  cannotClose = false 
}: BrokerBlockingModalProps) {
  const [pendingValidations, setPendingValidations] = useState<PendingValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && brokerId) {
      fetchPendingValidations();
    }
  }, [isOpen, brokerId]);

  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_validations', {
        p_broker_id: brokerId
      });

      if (error) throw error;
      setPendingValidations(data || []);
    } catch (err) {
      console.error('Erreur chargement validations en attente:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (dossierId: string) => {
    setValidating(dossierId);
    try {
      const { error } = await supabase.rpc('validate_dossier_payment', {
        p_dossier_id: dossierId
      });

      if (error) throw error;

      // Rafraîchir la liste
      await fetchPendingValidations();

      // Vérifier si on peut débloquer
      const { data: statusData } = await supabase.rpc('check_broker_blocking_status', {
        p_broker_id: brokerId
      });

      // Si plus bloqué, fermer la modale
      if (statusData && !statusData.is_blocked) {
        onClose();
      }
    } catch (err) {
      console.error('Erreur validation:', err);
      alert('Erreur lors de la validation du dossier');
    } finally {
      setValidating(null);
    }
  };

  if (!isOpen) return null;

  const overdueValidations = pendingValidations.filter(v => v.days_overdue > 0);
  const pendingNotOverdue = pendingValidations.filter(v => v.days_overdue <= 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={cannotClose ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="ri-lock-line text-white text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Action requise
              </h2>
              <p className="text-white/80 text-sm">
                {overdueValidations.length} dossier(s) en attente de validation
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
            </div>
          ) : (
            <>
              {/* Explication */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-amber-600 dark:text-amber-400 text-xl flex-shrink-0 mt-0.5"></i>
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                      Pourquoi cette action est nécessaire ?
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Lorsqu'un dossier est finalisé, vous devez confirmer que le contrat a bien été signé 
                      et que le paiement a été initié. Cela déclenche le versement de la commission à l'apporteur.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dossiers en retard */}
              {overdueValidations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>
                    En retard ({overdueValidations.length})
                  </h3>
                  <div className="space-y-3">
                    {overdueValidations.map((validation) => (
                      <div
                        key={validation.dossier_id}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {validation.numero_dossier}
                              </span>
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded-full">
                                {validation.days_overdue} jour(s) de retard
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {validation.client_prenom} {validation.client_nom}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Commission apporteur : {formatCurrency(validation.apporteur_amount / 100)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/dossiers/${validation.dossier_id}`}
                              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                              <i className="ri-eye-line mr-1"></i>
                              Voir
                            </Link>
                            <button
                              onClick={() => handleValidate(validation.dossier_id)}
                              disabled={validating === validation.dossier_id}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                              {validating === validation.dossier_id ? (
                                <>
                                  <i className="ri-loader-4-line animate-spin"></i>
                                  Validation...
                                </>
                              ) : (
                                <>
                                  <i className="ri-check-line"></i>
                                  Valider
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dossiers en attente (pas encore en retard) */}
              {pendingNotOverdue.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <i className="ri-time-line"></i>
                    En attente ({pendingNotOverdue.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingNotOverdue.map((validation) => (
                      <div
                        key={validation.dossier_id}
                        className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {validation.numero_dossier}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {validation.client_prenom} {validation.client_nom}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Commission apporteur : {formatCurrency(validation.apporteur_amount / 100)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/dossiers/${validation.dossier_id}`}
                              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                              <i className="ri-eye-line mr-1"></i>
                              Voir
                            </Link>
                            <button
                              onClick={() => handleValidate(validation.dossier_id)}
                              disabled={validating === validation.dossier_id}
                              className="px-4 py-2 bg-[#335FAD] hover:bg-[#2a4d8f] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                              {validating === validation.dossier_id ? (
                                <>
                                  <i className="ri-loader-4-line animate-spin"></i>
                                  Validation...
                                </>
                              ) : (
                                <>
                                  <i className="ri-check-line"></i>
                                  Valider
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingValidations.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-check-line text-green-600 dark:text-green-400 text-3xl"></i>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tous les dossiers ont été validés !
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {cannotClose && overdueValidations.length > 0 ? (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              <i className="ri-lock-line mr-1"></i>
              Validez tous les dossiers en retard pour débloquer votre compte
            </p>
          ) : (
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                Fermer
              </button>
              <Link
                href="/admin/billing"
                className="px-4 py-2 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <i className="ri-wallet-3-line"></i>
                Voir tous les paiements
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BrokerBlockingModal;





