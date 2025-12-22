interface PendingUpdate {
  activityId: string;
  isRead: boolean;
  timestamp: number;
}

interface OverrideEntry {
  isRead: boolean;
  timestamp: number;
}

interface CacheData {
  pendingUpdates: PendingUpdate[];
  overrides: Record<string, OverrideEntry>;
  lastSync: number;
}

export class ActivityReadStatusCache {
  private static readonly STORAGE_KEY = 'activity_read_status_cache';
  private static readonly SYNC_INTERVAL = 2000; // 2 secondes
  private static readonly BATCH_SIZE = 10;
  private static readonly OVERRIDE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
  private static syncTimeout: NodeJS.Timeout | null = null;
  private static syncCallbacks: Set<() => void> = new Set();

  /**
   * Marque une activité comme lue de manière optimiste
   */
  static markAsReadOptimistic(activityId: string): void {
    // Ajouter à la queue locale
    this.addPendingUpdate(activityId, true);
    this.setOverride(activityId, true);
    
    // Démarrer la synchronisation en arrière-plan
    this.scheduleSync();
  }

  /**
   * Marque une activité comme non lue de manière optimiste
   */
  static markAsUnreadOptimistic(activityId: string): void {
    this.addPendingUpdate(activityId, false);
    this.setOverride(activityId, false);
    this.scheduleSync();
  }

  /**
   * Récupère l'état de lecture depuis le cache local
   */
  static getReadStatus(activityId: string): boolean | null {
    const cache = this.getCache();
    // 1) Priorité aux overrides locaux (persiste même après refresh)
    const override = cache.overrides[activityId];
    if (override) {
      return override.isRead;
    }
    const pendingUpdate = cache.pendingUpdates.find(update => update.activityId === activityId);
    
    if (pendingUpdate) {
      return pendingUpdate.isRead;
    }
    
    return null; // Pas dans le cache, utiliser l'état de la DB
  }

  /**
   * Vérifie si une activité a des mises à jour en attente
   */
  static hasPendingUpdates(activityId: string): boolean {
    const cache = this.getCache();
    return cache.pendingUpdates.some(update => update.activityId === activityId);
  }

  /**
   * Ajoute une mise à jour à la queue
   */
  private static addPendingUpdate(activityId: string, isRead: boolean): void {
    const cache = this.getCache();
    
    // Supprimer les anciennes mises à jour pour cette activité
    cache.pendingUpdates = cache.pendingUpdates.filter(update => update.activityId !== activityId);
    
    // Ajouter la nouvelle mise à jour
    cache.pendingUpdates.push({
      activityId,
      isRead,
      timestamp: Date.now()
    });
    
    this.saveCache(cache);
  }

  /**
   * Définit/écrase un override local
   */
  private static setOverride(activityId: string, isRead: boolean): void {
    const cache = this.getCache();
    cache.overrides[activityId] = { isRead, timestamp: Date.now() };
    this.saveCache(cache);
  }

  /**
   * Planifie une synchronisation
   */
  private static scheduleSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncWithDatabase();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Synchronise avec la base de données
   */
  private static async syncWithDatabase(): Promise<void> {
    const cache = this.getCache();
    
    if (cache.pendingUpdates.length === 0) {
      return;
    }

    try {
      // Traiter par batch
      const batches = this.chunkArray(cache.pendingUpdates, this.BATCH_SIZE);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }
      
      // Marquer comme synchronisé
      cache.lastSync = Date.now();
      cache.pendingUpdates = [];
      this.saveCache(cache);
      
      // Notifier les callbacks de synchronisation
      this.syncCallbacks.forEach(callback => callback());
      
    } catch (error) {
      console.error('Erreur lors de la synchronisation des activités:', error);
      // Garder les mises à jour en attente pour un retry
    }
  }

  /**
   * Traite un batch de mises à jour
   */
  private static async processBatch(batch: PendingUpdate[]): Promise<void> {
    const { supabase } = await import('@/lib/supabase');
    
    // Grouper par état
    const readIds = batch.filter(update => update.isRead).map(update => update.activityId);
    const unreadIds = batch.filter(update => !update.isRead).map(update => update.activityId);
    
    // Mettre à jour les lues
    if (readIds.length > 0) {
      const { error: readError } = await supabase
        .from('activities')
        .update({ is_read: true })
        .in('id', readIds);
        
      if (readError) throw readError;
    }
    
    // Mettre à jour les non lues
    if (unreadIds.length > 0) {
      const { error: unreadError } = await supabase
        .from('activities')
        .update({ is_read: false })
        .in('id', unreadIds);
        
      if (unreadError) throw unreadError;
    }
  }

  /**
   * Divise un tableau en chunks
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Récupère le cache depuis localStorage
   */
  private static getCache(): CacheData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const cache: CacheData = stored ? JSON.parse(stored) : { pendingUpdates: [], overrides: {}, lastSync: 0 };
      // Nettoyer les overrides trop anciens
      const now = Date.now();
      const overrides: Record<string, OverrideEntry> = {};
      for (const [id, entry] of Object.entries(cache.overrides || {})) {
        if (now - entry.timestamp < this.OVERRIDE_TTL_MS) {
          overrides[id] = entry;
        }
      }
      cache.overrides = overrides;
      return cache;
    } catch {
      return { pendingUpdates: [], overrides: {}, lastSync: 0 };
    }
  }

  /**
   * Sauvegarde le cache dans localStorage
   */
  private static saveCache(cache: CacheData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache activités:', error);
    }
  }

  /**
   * Force la synchronisation immédiate
   */
  static async forceSync(): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    await this.syncWithDatabase();
  }

  /**
   * Nettoie le cache (pour les tests)
   */
  static clearCache(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Ajoute un callback de synchronisation
   */
  static onSync(callback: () => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }
}


