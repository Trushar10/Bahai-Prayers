import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Offline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Redirect to home when back online
    if (isOnline) {
      router.push('/');
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isOnline, router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/');
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <Head>
        <title>Offline - Prayer App</title>
        <meta name="description" content="You are currently offline" />
      </Head>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '2rem',
          backgroundColor: 'var(--container-bg)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📱</div>
          
          <h1 style={{ 
            marginBottom: '1rem', 
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            You&apos;re Offline
          </h1>
          
          <p style={{ 
            marginBottom: '1.5rem', 
            color: 'var(--post-subtext)',
            lineHeight: 1.6
          }}>
            Don&apos;t worry! This app works offline. If you&apos;ve installed it, 
            you can still access your downloaded prayers.
          </p>
          
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--hover-bg)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Status:</strong> {isOnline ? '🟢 Back Online!' : '🔴 Offline'}
            </div>
            
            {!isOnline && (
              <div style={{ color: 'var(--post-subtext)' }}>
                The app will automatically load when you&apos;re back online, or you can try refreshing.
              </div>
            )}
          </div>

          <button
            onClick={handleRetry}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: isOnline ? '#28a745' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            {isOnline ? '🔄 Go to App' : '🔄 Try Again'}
          </button>
          
          <p style={{ 
            marginTop: '1rem',
            fontSize: '0.8rem',
            color: 'var(--post-subtext)'
          }}>
            Tip: Install this app to your home screen for the best offline experience!
          </p>
        </div>
      </div>
    </>
  );
}
