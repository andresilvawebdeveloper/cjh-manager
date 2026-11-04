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
      </body>
    </html>
  );
}