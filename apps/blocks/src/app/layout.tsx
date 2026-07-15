import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { Providers } from './providers';
import { Shell } from '@/components/docs/shell';
import { OG_IMAGE, SITE_NAME, SITE_ORIGIN, withBase } from '@/lib/site';
import './globals.css';

// The UI theme maps Tailwind's font utilities onto `--font-geist-sans` /
// `--font-geist-mono`. We feed Geist (UI + display) and Geist Mono (figures /
// code, tabular-nums) into those variables here — both are applied on <html>.
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const SITE_TITLE = 'Constructive Blocks — full-stack auth, org, and app-shell React blocks';
const SITE_DESCRIPTION =
  'A shadcn registry of auth, organization, user, and app-shell blocks for the Constructive platform. Each block binds to your application’s generated SDK.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: '%s — Constructive Blocks',
  },
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
  // The card image is declared explicitly (site.ts OG_IMAGE → the
  // /opengraph-image.png route), NOT via the opengraph-image file convention:
  // the convention's auto-injected URL omits the deploy basePath and 404s on
  // GitHub Pages.
  twitter: { card: 'summary_large_image', images: [OG_IMAGE] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* Theme + package-manager context, then the global 3-column shell that
            every route (including the landing) renders inside. */}
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
