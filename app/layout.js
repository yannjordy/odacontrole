import './globals.css';

export const metadata = {
  title: 'ODA Contrôle — Tour de contrôle',
  description: "Panneau d'administration ODA Marketplace",
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
