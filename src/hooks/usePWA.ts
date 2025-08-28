import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Initialize online status
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none', // Always check for updates
          });
          
          setSwRegistration(registration);
          console.log('SW registered successfully:', registration);
          
          // Force immediate activation of new service worker
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New service worker available, will refresh');
                    // Auto-refresh to use new service worker
                    window.location.reload();
                  } else {
                    console.log('Service worker installed for the first time');
                  }
                }
              });
            }
          });
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
          
        } catch (error) {
          console.error('SW registration failed:', error);
        }
      };
      
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }
    }

    // Check if app is installed (PWA)
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSInstalled = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone || isIOSInstalled);
    };

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check installation status
    checkInstalled();
    
    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      console.log('PWA was installed successfully');
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', () => setIsInstalled(true));
    };
  }, []);

  const updateServiceWorker = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { 
    isInstalled, 
    isOnline, 
    swRegistration,
    updateServiceWorker 
  };
};
