import type { ReactNode } from 'react';
import { Geist, IBM_Plex_Sans, Open_Sans } from 'next/font/google';

/**
 * The playground's optional preview fonts load only on this route — the host
 * page and the rest of the docs never pay for them. Each variable name is a
 * previewStack target in lib/theme-playground/draft.ts. Inter needs no load
 * here: it is the shipped --font-sans and the root layout already loads it
 * into --font-sans-loaded (which reaches this document's :root via <html>).
 *
 * `previewStyleSheet` writes `--font-sans: var(--font-open-sans), …` on
 * `:root`, so the variables must be defined on `:root` too — a wrapper
 * element's `*.variable` classes would leave them undefined there.
 */
const openSans = Open_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-open-sans' });
const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-geist' });
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plex',
  weight: ['400', '500', '600'],
});

const rootFontVariables = `:root {
  --font-open-sans: ${openSans.style.fontFamily};
  --font-geist: ${geist.style.fontFamily};
  --font-plex: ${plex.style.fontFamily};
}`;

export default function CreatePreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{rootFontVariables}</style>
      <div className={`${openSans.variable} ${geist.variable} ${plex.variable}`}>{children}</div>
    </>
  );
}
