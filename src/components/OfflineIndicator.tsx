import React, { useState, useEffect } from 'react';
import { useOnlineStatus, getCacheStatus } from '../lib/offline';

interface OfflineIndicatorProps {
  showOnlineMessage?: boolean;
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  showOnlineMessage = false,
  className = '' 
}) => {
  const [mounted, setMounted] = useState(false);
  const { isOnline, networkTested } = useOnlineStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [hasCachedContent, setHasCachedContent] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check for cached content
    const checkCache = async () => {
      try {
        const cacheStatus = await getCacheStatus();
        setHasCachedContent(cacheStatus.cachedPrayersCount > 0);
      } catch (error) {
        console.warn('Failed to check cache status:', error);
        setHasCachedContent(false);
      }
    };
    
    checkCache();
  }, []);

  useEffect(() => {
    if (!mounted || !networkTested) return;
    
    // Show offline indicator if we're offline AND have cached content
    if (!isOnline && hasCachedContent) {
      setShowIndicator(true);
      setWasOffline(true);
    } else if (isOnline && wasOffline && showOnlineMessage) {
      // Show "back online" message briefly when reconnected
      setShowIndicator(true);
      const timer = setTimeout(() => {
        setShowIndicator(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isOnline, wasOffline, showOnlineMessage, mounted, networkTested, hasCachedContent]);

  if (!mounted || !showIndicator) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${className}`}>
      <div className="offline-indicator-content">
        {isOnline ? (
          <>
            <span className="offline-icon">✅</span>
            <span className="offline-text">Back online</span>
          </>
        ) : (
          <>
            <span className="offline-icon">📡</span>
            <span className="offline-text">You&apos;re offline - viewing cached content</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
