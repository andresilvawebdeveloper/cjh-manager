import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CJH Manager | Clube de Judo Hajime',
  description: 'Sistema de gestão para os centros de treino CJH',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        {/* Apenas renderiza o conteúdo da página atual (Login na raiz, Dashboard nas respetivas rotas) */}
        {children}
      </body>
    </html>
  );
}