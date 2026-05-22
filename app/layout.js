import './globals.css';

export const metadata = {
  title: 'ODA Contrôle — Tour de contrôle',
  description: "Panneau d'administration ODA Marketplace — IA multi-agent",
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.svg' },
  appleWebApp: {
    capable: true,
    title: 'ODA Control',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e293b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
