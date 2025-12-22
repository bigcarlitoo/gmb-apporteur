'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface BlockingStatus {
  is_blocked: boolean;
  pending_count: number;
  overdue_count: number;
}

export function useBrokerBlocking(brokerId: string | null) {
  const [status, setStatus] = useState<BlockingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const checkBlockingStatus = useCallback(async () => {
    if (!brokerId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_broker_blocking_status', {
        p_broker_id: brokerId
      });

      if (error) throw error;
      
      const newStatus = data as BlockingStatus;
      setStatus(newStatus);
      
      // Ouvrir automatiquement la modale si bloqué
      if (newStatus.is_blocked && !showModal) {
        setShowModal(true);
      }
    } catch (err) {
      console.error('[useBrokerBlocking] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [brokerId, showModal]);

  useEffect(() => {
    checkBlockingStatus();
    
    // Vérifier toutes les 60 secondes
    const interval = setInterval(checkBlockingStatus, 60000);
    return () => clearInterval(interval);
  }, [checkBlockingStatus]);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => {
    // Ne pas permettre de fermer si bloqué
    if (status?.is_blocked) {
      return;
    }
    setShowModal(false);
  }, [status?.is_blocked]);

  const forceCloseModal = useCallback(() => setShowModal(false), []);

  // Cette fonction est appelée avant une action bloquée
  const checkBeforeAction = useCallback(() => {
    if (status?.is_blocked) {
      setShowModal(true);
      return false; // Action bloquée
    }
    return true; // Action autorisée
  }, [status?.is_blocked]);

  return {
    status,
    loading,
    isBlocked: status?.is_blocked ?? false,
    pendingCount: status?.pending_count ?? 0,
    overdueCount: status?.overdue_count ?? 0,
    showModal,
    openModal,
    closeModal,
    forceCloseModal,
    checkBeforeAction,
    refresh: checkBlockingStatus
  };
}




