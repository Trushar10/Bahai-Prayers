import { dbService } from './indexedDBService';

interface SyncData {
  lastSyncTime: number;
  failedSyncAttempts: number;
  nextSyncTime: number;
}

class BackgroundSyncService {
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private maxRetries: number = 3;
  private retryDelay: number = 60 * 1000; // 1 minute

  async init(): Promise<void> {
    // Register for background sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Temporarily disabled due to TypeScript issues
        // await registration.sync.register('background-prayers-sync');
        console.log('Background sync registration temporarily disabled')
      } catch (error) {
        console.warn('Background sync registration failed:', error);
        // Fallback to periodic sync
        this.startPeriodicSync();
      }
    } else {
      // Fallback for browsers without background sync
      this.startPeriodicSync();
    }

    // Listen for online events
    window.addEventListener('online', () => {
      this.syncWhenOnline();
    });
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.performSync();
      }
    }, this.syncInterval);
  }

  async syncWhenOnline(): Promise<void> {
    if (navigator.onLine) {
      await this.performSync();
    }
  }

  async performSync(): Promise<boolean> {
    try {
      console.log('Starting background sync...');
      
      // Get sync metadata
      const syncDataRaw = await dbService.getCacheMetadata('syncData');
      const syncData: SyncData = syncDataRaw as SyncData || {
        lastSyncTime: 0,
        failedSyncAttempts: 0,
        nextSyncTime: 0
      };

      // Check if we should sync now
      if (Date.now() < syncData.nextSyncTime) {
        console.log('Skipping sync - too early');
        return false;
      }

      // Sync user interactions first
      await this.syncUserInteractions();

      // Sync fresh content from Contentful
      await this.syncContentfulData();

      // Update sync metadata on success
      await dbService.setCacheMetadata('syncData', {
        lastSyncTime: Date.now(),
        failedSyncAttempts: 0,
        nextSyncTime: Date.now() + this.syncInterval
      });

      console.log('Background sync completed successfully');
      return true;

    } catch (error) {
      console.error('Background sync failed:', error);
      
      // Handle failed sync
      const syncDataRaw = await dbService.getCacheMetadata('syncData');
      const syncData: SyncData = syncDataRaw as SyncData || {
        lastSyncTime: 0,
        failedSyncAttempts: 0,
        nextSyncTime: 0
      };

      syncData.failedSyncAttempts += 1;
      
      // Exponential backoff for retries
      const backoffDelay = Math.min(
        this.retryDelay * Math.pow(2, syncData.failedSyncAttempts - 1),
        30 * 60 * 1000 // Max 30 minutes
      );
      
      syncData.nextSyncTime = Date.now() + backoffDelay;

      await dbService.setCacheMetadata('syncData', syncData);
      
      return false;
    }
  }

  private async syncUserInteractions(): Promise<void> {
    const unsyncedInteractions = await dbService.getUnsyncedInteractions();
    
    if (unsyncedInteractions.length === 0) {
      return;
    }

    // Send interactions to analytics endpoint (if you have one)
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactions: unsyncedInteractions
        })
      });

      if (response.ok) {
        // Mark interactions as synced
        const interactionIds = unsyncedInteractions.map(i => i.id);
        await dbService.markInteractionsSynced(interactionIds);
        console.log(`Synced ${interactionIds.length} user interactions`);
      }
    } catch (error) {
      console.warn('Failed to sync user interactions:', error);
      // Don't throw - continue with content sync
    }
  }

  private async syncContentfulData(): Promise<void> {
    const languages = ['en', 'hi', 'gu'];
    
    for (const lang of languages) {
      try {
        const response = await fetch(`/api/prayers?lang=${lang}&timestamp=${Date.now()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch prayers for ${lang}: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          // Transform Contentful data to our format
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const prayersData = data.items.map((item: unknown) => {
                const contentfulItem = item as {
                  sys: { id: string };
                  fields: { title: string; slug: string; body: unknown };
                  metadata?: { tags?: Array<{ sys: { id: string } }> };
                };
                
                return {
                  id: contentfulItem.sys.id,
                  title: contentfulItem.fields.title,
                  slug: contentfulItem.fields.slug,
                  body: contentfulItem.fields.body,
                  language: lang,
                  tags: (contentfulItem.metadata?.tags || []).map(tag => tag.sys.id),
                  lastUpdated: Date.now()
                };
              });          // Save to IndexedDB
          await dbService.savePrayers(prayersData);
          console.log(`Synced ${prayersData.length} prayers for ${lang}`);
        }
      } catch (error) {
        console.error(`Failed to sync prayers for ${lang}:`, error);
        // Continue with other languages
      }
    }
  }

  async forceSync(): Promise<boolean> {
    // Reset sync metadata to force immediate sync
    await dbService.setCacheMetadata('syncData', {
      lastSyncTime: 0,
      failedSyncAttempts: 0,
      nextSyncTime: 0
    });

    return await this.performSync();
  }

  async getSyncStatus(): Promise<{
    lastSync: Date | null;
    nextSync: Date | null;
    failedAttempts: number;
    isOnline: boolean;
  }> {
    const syncDataRaw = await dbService.getCacheMetadata('syncData');
    const syncData: SyncData = syncDataRaw as SyncData || {
      lastSyncTime: 0,
      failedSyncAttempts: 0,
      nextSyncTime: 0
    };

    return {
      lastSync: syncData.lastSyncTime ? new Date(syncData.lastSyncTime) : null,
      nextSync: syncData.nextSyncTime ? new Date(syncData.nextSyncTime) : null,
      failedAttempts: syncData.failedSyncAttempts,
      isOnline: navigator.onLine
    };
  }
}

export const syncService = new BackgroundSyncService();
