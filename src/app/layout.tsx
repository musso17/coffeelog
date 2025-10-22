import { Inter } from 'next/font/google';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  applicationName: 'Cafe Log',
  title: 'Cafe Log',
  description: 'Administra tus cafés, recetas, brews y notas sensoriales.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
    other: [{ rel: 'mask-icon', url: '/icons/icon-192.png', color: '#12c877' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#12c877',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="es" suppressHydrationWarning>
    <body className={inter.className}>{children}</body>
  </html>
);

export default RootLayout;
