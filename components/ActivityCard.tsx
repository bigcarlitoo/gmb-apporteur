'use client'

import React from 'react'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'
import { useOptimisticActivityReadStatus } from '@/lib/hooks/useOptimisticActivityReadStatus'

interface ActivityCardProps {
  children: React.ReactNode
  activityId: string
  isRead: boolean
  onMarkAsRead: (id: string) => void
  isResponsive?: boolean
}

export default function ActivityCard({ 
  children, 
  activityId, 
  isRead: initialIsRead, 
  onMarkAsRead,
  isResponsive = false 
}: ActivityCardProps) {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.8, // 80% de l'élément visible
    freezeOnceVisible: true
  })

  const { isRead, markAsRead, hasPendingUpdate } = useOptimisticActivityReadStatus(
    activityId,
    initialIsRead
  )

  // Marquer comme lu quand visible (uniquement en responsive)
  React.useEffect(() => {
    if (isResponsive && isIntersecting && !isRead) {
      markAsRead()
      onMarkAsRead(activityId) // Pour la compatibilité avec l'ancien système
    }
  }, [isIntersecting, isRead, activityId, onMarkAsRead, isResponsive, markAsRead])

  // Cloner les enfants et ajouter les props optimistes
  const childrenWithOptimisticProps = React.cloneElement(children as React.ReactElement<any>, {
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


