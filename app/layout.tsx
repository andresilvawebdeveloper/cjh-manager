import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CJH Manager',
  description: 'CJH Manager - Clube de Judo Hajime',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-clube.png',
    shortcut: '/logo-clube.png',
    apple: '/logo-clube.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="bg-slate-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}