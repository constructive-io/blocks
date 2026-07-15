'use client';

import { ThemeProvider } from 'next-themes';

import { PmProvider } from '@/lib/pm-context';

/**
 * App providers. Dark-first registry language; `.dark` class drives the token
 * scopes in globals.css, so we toggle the `class` attribute. System theme stays
 * available (the right panel + drawer theme controls read next-themes).
 * `PmProvider` carries the reader's package-manager choice so every install
 * command on the site renders through it.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PmProvider>{children}</PmProvider>
    </ThemeProvider>
  );
}
