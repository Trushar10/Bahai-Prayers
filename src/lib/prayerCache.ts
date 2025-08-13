import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful'

// Remove unused Document import

// Types for cached data
type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text
  slug: EntryFieldTypes.Text
  body: EntryFieldTypes.RichText
}>

export type PrayerEntry = Entry<PrayerSkeleton>

export interface CachedPrayer {
  id: string; // Used as primary key
  title: string;
  slug: string;
  body: string;
  language: string;
  cachedAt: number; // timestamp
  sys: Record<string, unknown>; // Contentful sys object
  metadata?: Record<string, unknown>; // Contentful metadata
}

export interface CacheMetadata {
  version: string;
  lastFullSync: number;
  languages: string[];
  totalPrayers: number;
}

class PrayerCacheManager {
  private dbName = 'PrayerCache';
  private version = 3; // Increment version to force upgrade
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('IndexedDB not available in server environment');
      return;
    }

    // Check if IndexedDB is supported
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported in this browser');
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          console.error('Failed to open IndexedDB:', request.error);
          // Don't reject, just warn and continue without cache
          console.warn('Continuing without cache functionality');
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('IndexedDB initialized successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            
            console.log('Upgrading IndexedDB from version', event.oldVersion, 'to', event.newVersion);
            
            // Handle prayers store
            let prayersStore: IDBObjectStore;
            if (!db.objectStoreNames.contains('prayers')) {
              console.log('Creating prayers object store');
              prayersStore = db.createObjectStore('prayers', { keyPath: 'id' });
            } else {
              console.log('Using existing prayers object store');
              prayersStore = transaction!.objectStore('prayers');
            }
            
            // Ensure all required indexes exist
            if (!prayersStore.indexNames.contains('language')) {
              console.log('Creating language index');
              prayersStore.createIndex('language', 'language', { unique: false });
            }
            if (!prayersStore.indexNames.contains('slug')) {
              console.log('Creating slug index');
              prayersStore.createIndex('slug', 'slug', { unique: false });
            }
            if (!prayersStore.indexNames.contains('cachedAt')) {
              console.log('Creating cachedAt index');
              prayersStore.createIndex('cachedAt', 'cachedAt', { unique: false });
            }

            // Handle metadata store
            if (!db.objectStoreNames.contains('metadata')) {
              console.log('Creating metadata object store');
              db.createObjectStore('metadata', { keyPath: 'key' });
            }
            
            console.log('IndexedDB upgrade completed successfully');
          } catch (upgradeError) {
            console.error('Error during IndexedDB upgrade:', upgradeError);
            resolve(); // Continue without cache
          }
        };
      } catch (initError) {
        console.error('Error initializing IndexedDB:', initError);
        resolve(); // Continue without cache
      }
    });
  }

  // Ensure DB is initialized
  private async ensureInit(): Promise<void> {
    if (!this.db && typeof window !== 'undefined' && 'indexedDB' in window) {
      await this.init();
    }
  }

  // Check if cache is available
  private isCacheAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && this.db !== null;
  }

  // Get cached prayer by slug and language
  async getCachedPrayer(slug: string, language: string): Promise<CachedPrayer | null> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, returning null');
      return null;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const index = store.index('slug');
      const request = index.getAll(slug);

      request.onsuccess = () => {
        const prayers = request.result as CachedPrayer[];
        const prayer = prayers.find(p => p.language === language);
        resolve(prayer || null);
      };

      request.onerror = () => {
        console.error('Error getting cached prayer:', request.error);
        resolve(null);
      };
    });
  }

  // Get all cached prayers for a language
  async getCachedPrayersByLanguage(language: string): Promise<CachedPrayer[]> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, returning empty array');
      return [];
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(['prayers'], 'readonly');
        const store = transaction.objectStore('prayers');
        
        // Check if the language index exists
        if (store.indexNames.contains('language')) {
          const index = store.index('language');
          const request = index.getAll(language);

          request.onsuccess = () => {
            resolve(request.result as CachedPrayer[]);
          };

          request.onerror = () => {
            console.error('Error getting cached prayers by language index:', request.error);
            resolve([]);
          };
        } else {
          // Fallback: scan all records if index doesn't exist
          console.warn('Language index not found, falling back to full scan');
          const request = store.getAll();
          
          request.onsuccess = () => {
            const allPrayers = request.result as CachedPrayer[];
            const filteredPrayers = allPrayers.filter(prayer => prayer.language === language);
            resolve(filteredPrayers);
          };

          request.onerror = () => {
            console.error('Error getting all cached prayers for fallback:', request.error);
            resolve([]);
          };
        }
      } catch (error) {
        console.error('Error in getCachedPrayersByLanguage:', error);
        resolve([]);
      }
    });
  }

  // Cache a single prayer
  async cachePrayer(prayer: PrayerEntry, language: string): Promise<void> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, skipping cache operation');
      return;
    }

    const cachedPrayer: CachedPrayer = {
      id: `${prayer.sys.id}-${language}`,
      title: typeof prayer.fields.title === 'string' ? prayer.fields.title : '',
      slug: typeof prayer.fields.slug === 'string' ? prayer.fields.slug : '',
      body: typeof prayer.fields.body === 'string' ? prayer.fields.body : JSON.stringify(prayer.fields.body),
      sys: prayer.sys as unknown as Record<string, unknown>,
      metadata: (prayer.metadata as Record<string, unknown>) || {},
      language,
      cachedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prayers'], 'readwrite');
      const store = transaction.objectStore('prayers');
      const request = store.put(cachedPrayer);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error caching prayer:', request.error);
        reject(request.error);
      };
    });
  }

  // Cache multiple prayers
  async cachePrayers(prayers: PrayerEntry[], language: string): Promise<void> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, skipping cache operation');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prayers'], 'readwrite');
      const store = transaction.objectStore('prayers');
      let completed = 0;
      let hasError = false;

      if (prayers.length === 0) {
        resolve();
        return;
      }

      prayers.forEach((prayer) => {
        const cachedPrayer: CachedPrayer = {
          id: `${prayer.sys.id}-${language}`,
          title: typeof prayer.fields.title === 'string' ? prayer.fields.title : '',
          slug: typeof prayer.fields.slug === 'string' ? prayer.fields.slug : '',
          body: typeof prayer.fields.body === 'string' ? prayer.fields.body : JSON.stringify(prayer.fields.body),
          sys: prayer.sys as unknown as Record<string, unknown>,
          metadata: (prayer.metadata as Record<string, unknown>) || {},
          language,
          cachedAt: Date.now()
        };

        const request = store.put(cachedPrayer);
        
        request.onsuccess = () => {
          completed++;
          if (completed === prayers.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          console.error('Error caching prayer:', prayer.fields.title, request.error);
          reject(request.error);
        };
      });
    });
  }

  // Update cache metadata
  async updateMetadata(metadata: Partial<CacheMetadata>): Promise<void> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, skipping metadata update');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      const existing = { key: 'cache-info', ...metadata };
      const request = store.put(existing);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error updating metadata:', request.error);
        reject(request.error);
      };
    });
  }

  // Get cache metadata
  async getMetadata(): Promise<CacheMetadata | null> {
    await this.ensureInit();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('cache-info');

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Error getting metadata:', request.error);
        resolve(null);
      };
    });
  }

  // Check if cache needs refresh (older than 24 hours)
  async needsRefresh(): Promise<boolean> {
    const metadata = await this.getMetadata();
    if (!metadata) return true;
    
    const dayInMs = 24 * 60 * 60 * 1000;
    return Date.now() - metadata.lastFullSync > dayInMs;
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, skipping clear operation');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prayers', 'metadata'], 'readwrite');
      const prayersStore = transaction.objectStore('prayers');
      const metadataStore = transaction.objectStore('metadata');

      const clearPrayers = prayersStore.clear();
      const clearMetadata = metadataStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) resolve();
      };

      clearPrayers.onsuccess = checkComplete;
      clearMetadata.onsuccess = checkComplete;
      
      clearPrayers.onerror = clearMetadata.onerror = () => {
        console.error('Error clearing cache');
        reject(new Error('Failed to clear cache'));
      };
    });
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ totalPrayers: number; languages: string[]; lastSync: Date | null; size: number }> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, returning empty stats');
      return { totalPrayers: 0, languages: [], lastSync: null, size: 0 };
    }

    // Get actual database size first
    const actualSize = await this.getDatabaseSize();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['prayers', 'metadata'], 'readonly');
      const prayersStore = transaction.objectStore('prayers');
      const metadataStore = transaction.objectStore('metadata');

      const countRequest = prayersStore.count();
      const metadataRequest = metadataStore.get('cache-info');

      let totalPrayers = 0;
      let metadata: CacheMetadata | null = null;

      countRequest.onsuccess = () => {
        totalPrayers = countRequest.result;
        checkComplete();
      };

      metadataRequest.onsuccess = () => {
        metadata = metadataRequest.result;
        checkComplete();
      };

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve({
            totalPrayers,
            languages: metadata?.languages || [],
            lastSync: metadata?.lastFullSync ? new Date(metadata.lastFullSync) : null,
            size: actualSize
          });
        }
      };

      countRequest.onerror = metadataRequest.onerror = () => {
        resolve({ totalPrayers: 0, languages: [], lastSync: null, size: actualSize });
      };
    });
  }

  private estimateSize(prayerCount: number): number {
    // More accurate estimate: each prayer ~8KB (text content + metadata)
    return prayerCount * 8 * 1024;
  }

  // Get actual database size
  async getDatabaseSize(): Promise<number> {
    await this.ensureInit();
    if (!this.isCacheAvailable()) {
      console.warn('Cache not available, returning 0 for database size');
      return 0;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const request = store.getAll();

      request.onsuccess = () => {
        const prayers = request.result as CachedPrayer[];
        let totalSize = 0;
        
        prayers.forEach(prayer => {
          // Calculate size of each prayer object in bytes
          const jsonString = JSON.stringify(prayer);
          totalSize += new Blob([jsonString]).size;
        });

        resolve(totalSize);
      };

      request.onerror = () => {
        resolve(this.estimateSize(0));
      };
    });
  }
}

// Create singleton instance
export const prayerCache = new PrayerCacheManager();

// Utility functions for easy access
export async function getCachedPrayer(slug: string, language: string): Promise<CachedPrayer | null> {
  try {
    return await prayerCache.getCachedPrayer(slug, language);
  } catch (error) {
    console.error('Error getting cached prayer:', error);
    return null;
  }
}

export async function getCachedPrayersByLanguage(language: string): Promise<CachedPrayer[]> {
  try {
    return await prayerCache.getCachedPrayersByLanguage(language);
  } catch (error) {
    console.error('Error getting cached prayers:', error);
    return [];
  }
}

export async function cachePrayer(prayer: PrayerEntry, language: string): Promise<void> {
  try {
    await prayerCache.cachePrayer(prayer, language);
  } catch (error) {
    console.error('Error caching prayer:', error);
  }
}

export async function cachePrayers(prayers: PrayerEntry[], language: string): Promise<void> {
  try {
    await prayerCache.cachePrayers(prayers, language);
  } catch (error) {
    console.error('Error caching prayers:', error);
  }
}

export async function getCacheStats() {
  try {
    return await prayerCache.getCacheStats();
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalPrayers: 0, languages: [], lastSync: null, size: 0 };
  }
}

export async function clearPrayerCache(): Promise<void> {
  try {
    await prayerCache.clearCache();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
