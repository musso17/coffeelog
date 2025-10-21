import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cafe Log',
  description: 'Administra tus cafés, recetas, brews y notas sensoriales.',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="es">
    <body className={inter.className}>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
