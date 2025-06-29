import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | spicetify-viz',
    default: 'spicetify-viz',
  },
  description: 'spicetify-viz Documentation',
  icons: {
    icon: [
      { url: '/img/favicon/favicon.ico', sizes: 'any' },
      { url: '/img/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/img/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/img/favicon/apple-touch-icon.png', type: 'image/png' }],
  },
  manifest: '/img/favicon/site.webmanifest',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
