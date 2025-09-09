import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007bff" />
        
        {/* Icons */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="32x32" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=2" />
        <link rel="apple-touch-icon" href="/favicon-192.png?v=2" />
        
        {/* iOS specific PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bahá'í Prayers" />
        
        {/* Android specific */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-Y1J3V8YLEC"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Y1J3V8YLEC');
            `,
          }}
        />
        
        {/* Preload theme before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored === 'dark' || stored === 'light'
                    ? stored
                    : (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (_) {}
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
