import { t } from '@/lib/i18n';
import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: t('MoMo Lens | Your money, a clearer picture'),
  description: t(
    'Understand your Ghana mobile money statement. No uploads, no accounts, no tracking. Everything stays on your device.',
  ),
  manifest: '/manifest.webmanifest',
  applicationName: t('MoMo Lens'),
  appleWebApp: { capable: true, statusBarStyle: 'default', title: t('MoMo Lens') },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#141414' };
const devScript = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${devScript}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-tight-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>{children}</body>
    </html>
  );
}
