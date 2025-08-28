import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const downloadOfflineContent = async () => {
    setIsDownloading(true);
    try {
      // Download content for all languages
      const languages = ['en', 'es', 'fr', 'de']; // Add your supported languages
      
      for (const lang of languages) {
        const response = await fetch(`/api/prayers?lang=${lang}`);
        const data = await response.json();
        
        // Cache the response
        const cache = await caches.open('prayer-offline-v1');
        await cache.put(`/api/prayers?lang=${lang}`, new Response(JSON.stringify(data)));
      }
      
      // Mark content as downloaded
      localStorage.setItem('offlineContentDownloaded', 'true');
    } catch (error) {
      console.error('Error downloading offline content:', error);
    }
    setIsDownloading(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // First download offline content
    await downloadOfflineContent();

    // Then show install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  return (
    <button
      onClick={handleInstallClick}
      disabled={isDownloading}
      className="install-btn"
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isDownloading ? 'not-allowed' : 'pointer',
        fontSize: '14px'
      }}
    >
      {isDownloading ? 'Downloading...' : '📱 Install App'}
    </button>
  );
};

export default InstallPrompt;
