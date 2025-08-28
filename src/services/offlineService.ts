class OfflineService {
  private readonly CACHE_NAME = 'prayer-offline-v1';
  private readonly CONTENT_KEY = 'offlineContent';

  async downloadAllContent(): Promise<void> {
    try {
      const languages = ['en', 'es', 'fr', 'de']; // Your supported languages
      const contentTypes = ['prayers', 'categories', 'translations']; // Your content types
      
      const cache = await caches.open(this.CACHE_NAME);
      
      for (const lang of languages) {
        for (const type of contentTypes) {
          const url = `/api/${type}?lang=${lang}`;
          
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response.clone());
            }
          } catch (error) {
            console.warn(`Failed to cache ${type} for ${lang}:`, error);
          }
        }
      }
      
      // Mark as downloaded
      localStorage.setItem('offlineContentDownloaded', new Date().toISOString());
    } catch (error) {
      console.error('Error downloading offline content:', error);
      throw error;
    }
  }

  async getOfflineContent(url: string): Promise<any> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      
      if (response) {
        return await response.json();
      }
      
      // Fallback to network if available
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        // Cache for future use
        await cache.put(url, networkResponse.clone());
        return await networkResponse.json();
      }
      
      throw new Error('Content not available offline');
    } catch (error) {
      console.error('Error getting offline content:', error);
      throw error;
    }
  }

  isOfflineContentAvailable(): boolean {
    return localStorage.getItem('offlineContentDownloaded') !== null;
  }

  getLastDownloadDate(): Date | null {
    const dateString = localStorage.getItem('offlineContentDownloaded');
    return dateString ? new Date(dateString) : null;
  }
}

export default new OfflineService();
