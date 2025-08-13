import { useState, useEffect } from 'react';

/**
 * Offline utilities for prayer app
 * Provides functions to check cache status and manage offline data
 */

export interface CachedPrayer {
  id: string;
  title: string;
  slug: string;
  body: string | Record<string, unknown>; // Replaced `any`
  sys: Record<string, unknown>;           // Replaced `any`
  metadata?: Record<string, unknown>;     // Replaced `any`
}

export interface CacheStatus {
  isOnline: boolean;
  cachedPrayersCount: number;
  lastCacheUpdate: Date | null;
  cacheSize: number; // in bytes
}

/**
 * Check if prayers are cached and available offline
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  const isOnline = navigator.onLine;

  try {
    const cachedPrayers = await getAllCachedPrayers();
    const lastCacheUpdate = await getLastCacheUpdate();
    const cacheSize = await estimateCacheSize();

    return {
      isOnline,
      cachedPrayersCount: cachedPrayers.length,
      lastCacheUpdate,
      cacheSize,
    };
  } catch (error) {
    console.error('Error getting cache status:', error);
    return {
      isOnline,
      cachedPrayersCount: 0,
      lastCacheUpdate: null,
      cacheSize: 0,
    };
  }
}

/**
 * Get all cached prayers from IndexedDB
 */
export async function getAllCachedPrayers(): Promise<CachedPrayer[]> {
  return new Promise((resolve) => {
    const request = indexedDB.open('PrayersDB', 1);

    request.onerror = () => resolve([]);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };

      getAllRequest.onerror = () => resolve([]);
    };
  });
}

/**
 * Get a specific prayer from cache
 */
export async function getCachedPrayer(slug: string): Promise<CachedPrayer | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('PrayersDB', 1);

    request.onerror = () => resolve(null);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['prayers'], 'readonly');
      const store = transaction.objectStore('prayers');
      const getRequest = store.get(slug);

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };

      getRequest.onerror = () => resolve(null);
    };
  });
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('PrayersDB', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['prayers'], 'readwrite');
        const store = transaction.objectStore('prayers');
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };

      request.onerror = () => reject(request.error);
    });

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }

    console.log('✅ All caches cleared');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

async function getLastCacheUpdate(): Promise<Date | null> {
  try {
    const stored = localStorage.getItem('lastCacheUpdate');
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}

export function setLastCacheUpdate(): void {
  try {
    localStorage.setItem('lastCacheUpdate', new Date().toISOString());
  } catch {
    // Ignore if localStorage is not available
  }
}

async function estimateCacheSize(): Promise<number> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    // Handle SSR by returning true initially, then updating on client
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    // Set the actual online status once mounted on client
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
