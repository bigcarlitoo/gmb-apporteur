'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BlockingStatus {
  is_blocked: boolean;
  pending_count: number;
  overdue_count: number;
}

interface BrokerBlockingBannerProps {
  brokerId: string;
  onOpenModal: () => void;
}

export function BrokerBlockingBanner({ brokerId, onOpenModal }: BrokerBlockingBannerProps) {
  const [status, setStatus] = useState<BlockingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (brokerId) {
      checkBlockingStatus();
      
      // Vérifier toutes les 60 secondes
      const interval = setInterval(checkBlockingStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [brokerId]);

  const checkBlockingStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('check_broker_blocking_status', {
        p_broker_id: brokerId
      });

      if (error) throw error;
      setStatus(data as BlockingStatus);
    } catch (err) {
      console.error('Erreur vérification blocage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ne rien afficher si pas de problème
  if (loading || !status || (status.pending_count === 0 && status.overdue_count === 0)) {
    return null;
  }

  const isBlocked = status.is_blocked;
  const hasOverdue = status.overdue_count > 0;

  return (
    <div 
      className={`fixed top-16 lg:top-20 left-0 right-0 z-40 px-4 py-3 ${
        isBlocked 
          ? 'bg-gradient-to-r from-red-500 to-red-600' 
          : hasOverdue 
            ? 'bg-gradient-to-r from-orange-500 to-amber-500'
            : 'bg-gradient-to-r from-[#335FAD] to-blue-500'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isBlocked ? 'bg-white/20' : 'bg-white/20'
          }`}>
            <i className={`${
              isBlocked ? 'ri-lock-line' : hasOverdue ? 'ri-alarm-warning-line' : 'ri-time-line'
            } text-white text-lg`}></i>
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {isBlocked 
                ? `Compte bloqué - ${status.overdue_count} dossier(s) en retard`
                : hasOverdue
                  ? `${status.overdue_count} dossier(s) en retard de validation`
                  : `${status.pending_count} dossier(s) en attente de validation`
              }
            </p>
            <p className="text-white/80 text-xs">
              {isBlocked 
                ? 'Validez les paiements pour débloquer votre compte'
                : 'Validez les dossiers finalisés pour payer vos apporteurs'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={onOpenModal}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            isBlocked 
              ? 'bg-white text-red-600 hover:bg-gray-100' 
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isBlocked ? (
            <>
              <i className="ri-lock-unlock-line"></i>
              Débloquer
            </>
          ) : (
            <>
              <i className="ri-check-double-line"></i>
              Valider maintenant
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BrokerBlockingBanner;





