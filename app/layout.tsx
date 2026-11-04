import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegistarApp from './RegistarApp';

// O manifesto da app instalável está em app/manifest.ts (o Next.js liga-o automaticamente)
export const metadata: Metadata = {
  title: 'CJH Manager',
  description: 'CJH Manager - Clube de Judo Hajime',
  applicationName: 'CJH Manager',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'CJH',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1F4E78' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Aplica o tema antes de desenhar a página (evita "piscar" em branco) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t==='escuro'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-slate-50 text-gray-900 antialiased">
        {children}
        <RegistarApp />
      </body>
    </html>
  );
}