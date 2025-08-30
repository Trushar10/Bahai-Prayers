import React from 'react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  syncStatus?: {
    lastSync: Date | null;
    nextSync: Date | null;
    failedAttempts: number;
  };
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  isOnline, 
  syncStatus,
  className = '' 
}) => {
  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (syncStatus?.failedAttempts && syncStatus.failedAttempts > 0) {
      return `Sync failed (${syncStatus.failedAttempts} attempts)`;
    }
    
    if (syncStatus?.lastSync) {
      const timeDiff = Date.now() - syncStatus.lastSync.getTime();
      const minutes = Math.floor(timeDiff / (1000 * 60));
      
      if (minutes < 1) {
        return 'Just synced';
      } else if (minutes < 60) {
        return `Synced ${minutes}m ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `Synced ${hours}h ago`;
      }
    }
    
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return '🔴';
    }
    
    if (syncStatus?.failedAttempts && syncStatus.failedAttempts > 0) {
      return '⚠️';
    }
    
    return '🟢';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return '#dc3545';
    }
    
    if (syncStatus?.failedAttempts && syncStatus.failedAttempts > 0) {
      return '#ffc107';
    }
    
    return '#28a745';
  };

  return (
    <div 
      className={`offline-indicator ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: 'var(--hover-bg)',
        color: getStatusColor(),
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'help'
      }}
      title={`Status: ${getStatusText()}${
        syncStatus?.nextSync ? ` | Next sync: ${syncStatus.nextSync.toLocaleTimeString()}` : ''
      }`}
    >
      <span style={{ fontSize: '10px' }}>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
    </div>
  );
};

export default OfflineIndicator;
