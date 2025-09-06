import '../styles/modern-design.css'
import type { AppProps } from 'next/app'
import { Rasa } from 'next/font/google'
import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'

const rasa = Rasa({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-rasa',
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Global error handler for uncaught exceptions
    const handleGlobalError = (_event: ErrorEvent) => {
      // Error logging removed for production
    };

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (_event: PromiseRejectionEvent) => {
      // Error logging removed for production
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
          registration.unregister();
        }
      });
    }

    // Manual PWA service worker registration (only in production)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      }).then((registration) => {
        
        // Force immediate activation
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Force some API requests to trigger caching
        setTimeout(() => {
          fetch('/api/prayers?lang=en').then(() => {
            // Prayers API cached
          }).catch(() => {
            // Failed to cache prayers API
          });
        }, 2000);

      }).catch((_registrationError) => {
        // SW registration failed
      });

      // Listen for SW updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Service worker controller changed
        // Optionally reload the page to ensure the new SW is used
      });
    }
  }, []); // Empty dependency array for service worker effect

  return (
    <main className={rasa.className}>
      <Component {...pageProps} />
      <Analytics />
    </main>
  )
}
