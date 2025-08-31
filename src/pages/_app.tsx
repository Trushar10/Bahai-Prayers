import '../styles/prayers.css'
import type { AppProps } from 'next/app'
import { Rasa } from 'next/font/google'
import { useEffect } from 'react'

const rasa = Rasa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-rasa',
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Global error handler for uncaught exceptions
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      console.error('Error message:', event.message);
      console.error('Error filename:', event.filename);
    };

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection caught:', event.reason);
      console.error('Promise:', event.promise);
    };

    // Add global error listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []); // Empty dependency array

  // Service worker management in a separate effect
  useEffect(() => {
    // Unregister existing service workers in development
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(const registration of registrations) {
          console.log('Unregistering service worker in development mode');
          registration.unregister();
        }
      });
    }

    // Manual PWA service worker registration (only in production)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      }).then((registration) => {
        console.log('SW registered: ', registration);
        
        // Force immediate activation
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Force some API requests to trigger caching
        setTimeout(() => {
          fetch('/api/prayers?lang=en').then(() => {
            console.log('Prayers API cached');
          }).catch(() => {
            console.log('Failed to cache prayers API');
          });
        }, 2000);

      }).catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });

      // Listen for SW updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
        // Optionally reload the page to ensure the new SW is used
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker registration skipped in development mode');
    }
  }, []); // Empty dependency array for service worker effect

  return (
    <main className={rasa.className}>
      <Component {...pageProps} />
    </main>
  )
}
