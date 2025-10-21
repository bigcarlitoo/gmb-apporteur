'use client'

import React from 'react'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'
import { useOptimisticReadStatus } from '@/lib/hooks/useOptimisticReadStatus'

interface DossierCardProps {
  children: React.ReactNode
  dossierId: string
  isRead: boolean
  onMarkAsRead: (id: string) => void
  isResponsive?: boolean
}

export default function DossierCard({ 
  children, 
  dossierId, 
  isRead: initialIsRead, 
  onMarkAsRead,
  isResponsive = false 
}: DossierCardProps) {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.8, // 80% de l'élément visible
    freezeOnceVisible: true
  })

  const { isRead, markAsRead, hasPendingUpdate } = useOptimisticReadStatus(
    dossierId,
    initialIsRead
  )

  // Marquer comme lu quand visible (uniquement en responsive)
  React.useEffect(() => {
    if (isResponsive && isIntersecting && !isRead) {
      markAsRead()
      onMarkAsRead(dossierId) // Pour la compatibilité avec l'ancien système
    }
  }, [isIntersecting, isRead, dossierId, onMarkAsRead, isResponsive, markAsRead])

  // Cloner les enfants et ajouter les props optimistes
  const childrenWithOptimisticProps = React.cloneElement(children as React.ReactElement, {
    'data-is-read': isRead,
    'data-has-pending': hasPendingUpdate,
    'data-original-is-read': initialIsRead
  })

  return (
    <div ref={elementRef}>
      {childrenWithOptimisticProps}
    </div>
  )
}
