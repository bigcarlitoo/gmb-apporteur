import { useState, useEffect, useCallback } from 'react'
import { ActivityReadStatusCache } from '@/lib/services/activity-read-status-cache'

interface UseOptimisticActivityReadStatusReturn {
  isRead: boolean
  markAsRead: () => void
  markAsUnread: () => void
  hasPendingUpdate: boolean
}

export function useOptimisticActivityReadStatus(
  activityId: string,
  initialIsRead: boolean
): UseOptimisticActivityReadStatusReturn {
  const [localIsRead, setLocalIsRead] = useState(initialIsRead)
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false)

  // Vérifier le cache au montage et écouter les synchronisations
  useEffect(() => {
    const updateFromCache = () => {
      const cachedStatus = ActivityReadStatusCache.getReadStatus(activityId)
      const hasPending = ActivityReadStatusCache.hasPendingUpdates(activityId)
      
      if (cachedStatus !== null) {
        setLocalIsRead(cachedStatus)
      }
      setHasPendingUpdate(hasPending)
    }

    // Mise à jour initiale
    updateFromCache()

    // Écouter les synchronisations
    const unsubscribe = ActivityReadStatusCache.onSync(updateFromCache)

    return unsubscribe
  }, [activityId])

  // Mise à jour optimiste
  const markAsRead = useCallback(() => {
    setLocalIsRead(true)
    setHasPendingUpdate(true)
    ActivityReadStatusCache.markAsReadOptimistic(activityId)
  }, [activityId])

  const markAsUnread = useCallback(() => {
    setLocalIsRead(false)
    setHasPendingUpdate(true)
    ActivityReadStatusCache.markAsUnreadOptimistic(activityId)
  }, [activityId])

  // Mettre à jour quand l'état initial change
  useEffect(() => {
    const cachedStatus = ActivityReadStatusCache.getReadStatus(activityId)
    if (cachedStatus === null) {
      setLocalIsRead(initialIsRead)
      setHasPendingUpdate(false)
    }
  }, [activityId, initialIsRead])

  return {
    isRead: localIsRead,
    markAsRead,
    markAsUnread,
    hasPendingUpdate
  }
}


