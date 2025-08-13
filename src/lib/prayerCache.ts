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
  private dbName = 'PrayersDB';
  private version = 2;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create prayers store
        if (!db.objectStoreNames.contains('prayers')) {
          const prayersStore = db.createObjectStore('prayers', { keyPath: 'id' });
          prayersStore.createIndex('language', 'language', { unique: false });
          prayersStore.createIndex('slug', 'slug', { unique: false });
          prayersStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Ensure DB is initialized
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  // Get cached prayer by slug and language
  async getCachedPrayer(slug: string, language: string): Promise<CachedPrayer | null> {
    await this.ensureInit();
    if (!this.db) return null;

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
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const index = store.index('language');
      const request = index.getAll(language);

      request.onsuccess = () => {
        resolve(request.result as CachedPrayer[]);
      };

      request.onerror = () => {
        console.error('Error getting cached prayers by language:', request.error);
        resolve([]);
      };
    });
  }

  // Cache a single prayer
  async cachePrayer(prayer: PrayerEntry, language: string): Promise<void> {
    await this.ensureInit();
    if (!this.db) return;

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
    if (!this.db) return;

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
    if (!this.db) return;

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
    if (!this.db) return;

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
    if (!this.db) return { totalPrayers: 0, languages: [], lastSync: null, size: 0 };

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
            size: this.estimateSize(totalPrayers)
          });
        }
      };

      countRequest.onerror = metadataRequest.onerror = () => {
        resolve({ totalPrayers: 0, languages: [], lastSync: null, size: 0 });
      };
    });
  }

  private estimateSize(prayerCount: number): number {
    // Rough estimate: each prayer ~5KB
    return prayerCount * 5 * 1024;
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
