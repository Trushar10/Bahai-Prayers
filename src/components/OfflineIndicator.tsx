import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../lib/offline';

interface OfflineIndicatorProps {
  showOnlineMessage?: boolean;
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  showOnlineMessage = false,
  className = '' 
}) => {
  const [mounted, setMounted] = useState(false);
  const isOnline = useOnlineStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isOnline) {
      setShowIndicator(true);
      setWasOffline(true);
    } else if (wasOffline && showOnlineMessage) {
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
  }, [isOnline, wasOffline, showOnlineMessage, mounted]);

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
