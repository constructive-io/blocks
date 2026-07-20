import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { OG_IMAGE, SITE_NAME, SITE_ORIGIN, withBase } from '@/lib/site';

import './globals.css';

const SITE_TITLE = 'Constructive UI';
const SITE_DESCRIPTION = 'Base React primitives distributed through npm and the shadcn CLI.';

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
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[var(--z-layer-toast)] rounded-md bg-background px-3 py-2 text-sm focus:fixed focus:not-sr-only focus-visible:ring-2 focus-visible:ring-ring"
        >
          Skip to content
        </a>
        <header className="border-b bg-background">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
            <Link href="/" className="font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Constructive UI
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-5 text-sm text-muted-foreground">
              <Link href="/blocks" className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                Setup
              </Link>
              <Link
                href="/blocks/ui/button"
                className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Primitives
              </Link>
            </nav>
          </div>
        </header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
