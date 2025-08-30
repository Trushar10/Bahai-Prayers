// IndexedDB service for offline storage and caching
interface PrayerData {
  id: string;
  title: string;
  slug: string;
  body: unknown;
  language: string;
  tags: string[];
  lastUpdated: number;
}

interface UserInteraction {
  id: string;
  prayerId: string;
  action: 'view' | 'favorite' | 'share';
  timestamp: number;
  synced: boolean;
}

class IndexedDBService {
  private dbName = 'PrayerAppDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create prayers store
        if (!db.objectStoreNames.contains('prayers')) {
          const prayerStore = db.createObjectStore('prayers', { keyPath: 'id' });
          prayerStore.createIndex('language', 'language', { unique: false });
          prayerStore.createIndex('slug', 'slug', { unique: false });
        }

        // Create user interactions store
        if (!db.objectStoreNames.contains('interactions')) {
          const interactionStore = db.createObjectStore('interactions', { keyPath: 'id' });
          interactionStore.createIndex('prayerId', 'prayerId', { unique: false });
          interactionStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create cache metadata store
        if (!db.objectStoreNames.contains('cacheMetadata')) {
          db.createObjectStore('cacheMetadata', { keyPath: 'key' });
        }
      };
    });
  }

  async savePrayers(prayers: PrayerData[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['prayers'], 'readwrite');
    const store = transaction.objectStore('prayers');

    for (const prayer of prayers) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          ...prayer,
          lastUpdated: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getPrayers(language: string): Promise<PrayerData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const index = store.index('language');
      const request = index.getAll(language);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPrayerBySlug(slug: string, language: string): Promise<PrayerData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const index = store.index('slug');
      const request = index.getAll(slug);

      request.onsuccess = () => {
        const results = request.result.filter(p => p.language === language);
        resolve(results.length > 0 ? results[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveUserInteraction(interaction: UserInteraction): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['interactions'], 'readwrite');
    const store = transaction.objectStore('interactions');

    return new Promise((resolve, reject) => {
      const request = store.put(interaction);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedInteractions(): Promise<UserInteraction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['interactions'], 'readonly');
      const store = transaction.objectStore('interactions');
      const request = store.getAll();

      request.onsuccess = () => {
        const allInteractions = request.result;
        const unsyncedInteractions = allInteractions.filter(interaction => !interaction.synced);
        resolve(unsyncedInteractions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markInteractionsSynced(interactionIds: string[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['interactions'], 'readwrite');
    const store = transaction.objectStore('interactions');

    for (const id of interactionIds) {
      await new Promise<void>((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const interaction = getRequest.result;
          if (interaction) {
            interaction.synced = true;
            const putRequest = store.put(interaction);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            resolve();
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      });
    }
  }

  async setCacheMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cacheMetadata'], 'readwrite');
    const store = transaction.objectStore('cacheMetadata');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheMetadata(key: string): Promise<unknown> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cacheMetadata'], 'readonly');
      const store = transaction.objectStore('cacheMetadata');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldCacheData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - maxAge;
    
    // Clear old prayers
    const prayerTransaction = this.db!.transaction(['prayers'], 'readwrite');
    const prayerStore = prayerTransaction.objectStore('prayers');
    
    const prayerRequest = prayerStore.getAll();
    prayerRequest.onsuccess = () => {
      const prayers = prayerRequest.result;
      prayers.forEach(prayer => {
        if (prayer.lastUpdated < cutoffTime) {
          prayerStore.delete(prayer.id);
        }
      });
    };
  }

  async getStorageUsage(): Promise<{ used: number; total: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0
      };
    }
    return { used: 0, total: 0 };
  }
}

export const dbService = new IndexedDBService();
