import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PlannerProvider } from '@/context/PlannerContext';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Diario · Planeador — Diseña tu día',
  description: 'Diseña tu día productivo, hora por hora.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Planeador',
  },
};

export const viewport: Viewport = {
  themeColor: '#1b1712',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // para el notch de iOS
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300..900&display=swap"
          rel="stylesheet"
        />
        {/* Icono para iOS (Add to Home Screen) */}
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <PlannerProvider>{children}</PlannerProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
