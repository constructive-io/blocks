import type { ReactNode } from 'react';

/**
 * Content column for everything under `/blocks` (DESIGN.md §4.3). The global
 * 3-column shell (sidebar · main · right panel) now lives in the root layout, so
 * this reduces to a single centered reading measure — one width for text,
 * previews, code and tables. `mt-12 xl:mt-0` clears the floating mobile
 * hamburger; the shell owns the skip-link and `#main` target.
 */
export default function BlocksLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[760px] px-6 py-20 sm:py-28">{children}</div>;
}
