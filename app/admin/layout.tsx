'use client';

import { ReactNode } from 'react';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { useBrokerBlocking } from '@/hooks/useBrokerBlocking';
import { BrokerBlockingModal } from '@/components/features/blocking/BrokerBlockingModal';
import { BrokerBlockingBanner } from '@/components/features/blocking/BrokerBlockingBanner';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { currentBrokerId } = useBrokerContext();
  const { 
    isBlocked, 
    pendingCount, 
    overdueCount,
    showModal, 
    openModal, 
    closeModal 
  } = useBrokerBlocking(currentBrokerId);

  return (
    <>
      {/* Bannière de blocage (visible si dossiers en attente) */}
      {currentBrokerId && (pendingCount > 0 || overdueCount > 0) && (
        <BrokerBlockingBanner 
          brokerId={currentBrokerId}
          onOpenModal={openModal}
        />
      )}
      
      {/* Contenu principal avec padding supplémentaire si bannière visible */}
      <div className={pendingCount > 0 || overdueCount > 0 ? 'pt-14' : ''}>
        {children}
      </div>
      
      {/* Modale de blocage */}
      {currentBrokerId && (
        <BrokerBlockingModal
          brokerId={currentBrokerId}
          isOpen={showModal}
          onClose={closeModal}
          cannotClose={isBlocked}
        />
      )}
    </>
  );
}




