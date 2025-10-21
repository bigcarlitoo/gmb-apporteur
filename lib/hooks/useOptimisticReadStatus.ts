import { useState, useEffect, useCallback } from 'react'
import { ReadStatusCache } from '@/lib/services/read-status-cache'

interface UseOptimisticReadStatusReturn {
  isRead: boolean
  markAsRead: () => void
  markAsUnread: () => void
  hasPendingUpdate: boolean
}

export function useOptimisticReadStatus(
  dossierId: string,
  initialIsRead: boolean
): UseOptimisticReadStatusReturn {
  const [localIsRead, setLocalIsRead] = useState(initialIsRead)
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false)

  // Vérifier le cache au montage et écouter les synchronisations
  useEffect(() => {
    const updateFromCache = () => {
      const cachedStatus = ReadStatusCache.getReadStatus(dossierId)
      const hasPending = ReadStatusCache.hasPendingUpdates(dossierId)
      
      if (cachedStatus !== null) {
        setLocalIsRead(cachedStatus)
      }
      setHasPendingUpdate(hasPending)
    }

    // Mise à jour initiale
    updateFromCache()

    // Écouter les synchronisations
    const unsubscribe = ReadStatusCache.onSync(updateFromCache)

    return unsubscribe
  }, [dossierId])

  // Mise à jour optimiste
  const markAsRead = useCallback(() => {
    setLocalIsRead(true)
    setHasPendingUpdate(true)
    ReadStatusCache.markAsReadOptimistic(dossierId)
  }, [dossierId])

  const markAsUnread = useCallback(() => {
    setLocalIsRead(false)
    setHasPendingUpdate(true)
    ReadStatusCache.markAsUnreadOptimistic(dossierId)
  }, [dossierId])

  // Mettre à jour quand l'état initial change
  useEffect(() => {
    const cachedStatus = ReadStatusCache.getReadStatus(dossierId)
    if (cachedStatus === null) {
      setLocalIsRead(initialIsRead)
      setHasPendingUpdate(false)
    }
  }, [dossierId, initialIsRead])

  return {
    isRead: localIsRead,
    markAsRead,
    markAsUnread,
    hasPendingUpdate
  }
}
