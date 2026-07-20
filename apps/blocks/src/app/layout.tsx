import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { ThemeProvider } from '@/components/site/theme-provider';
import { OG_IMAGE, SITE_NAME, SITE_ORIGIN, withBase } from '@/lib/site';

import './globals.css';

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

const SITE_TITLE = 'Constructive UI';
const SITE_DESCRIPTION =
  'Base React primitives for Constructive products — install via npm or the shadcn CLI registry.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: SITE_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: withBase('/') },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    url: withBase('/'),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [OG_IMAGE] },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={openSans.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <div className="site-frame flex min-h-dvh flex-col">
            <a
              href="#main-content"
              className="sr-only fixed left-4 top-4 z-[var(--z-layer-toast)] rounded-md bg-background px-3 py-2 text-sm focus:fixed focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
            >
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
