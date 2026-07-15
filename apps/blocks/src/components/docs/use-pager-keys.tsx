'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { normalizePath } from '@/lib/docs/nav';
import { getAdjacent } from '@/lib/docs/registry';

/**
 * ←/→ keyboard paging over the full sidebar order (guides + reference), the same
 * chain the prev/next pager walks (DESIGN.md §4.1). Mount once in the shell.
 *
 * The landing (`/`) is page 0 of the chain but not part of `getAdjacent`'s doc
 * order, so it is special-cased: → advances to `/blocks`, ← does nothing.
 *
 * FF guards: ignored with any modifier, while typing (input/textarea/select/
 * contenteditable), or when focus sits inside a widget that owns arrow keys
 * (slider, tabs, listbox, menu, radiogroup) — so component demos keep their keys.
 */
export function usePagerKeys() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
        if (
          target.closest(
            '[role=slider],[role=tablist],[role=tab],[role=listbox],[role=menu],[role=menubar],[role=radiogroup]',
          )
        )
          return;
      }

      const path = normalizePath(pathname);
      let target_href: string | undefined;
      if (path === '/') {
        target_href = e.key === 'ArrowRight' ? '/blocks' : undefined;
      } else {
        const adjacent = getAdjacent(path);
        target_href = e.key === 'ArrowLeft' ? adjacent.prev?.href : adjacent.next?.href;
      }
      if (!target_href) return;

      e.preventDefault();
      router.push(target_href as Route);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname, router]);
}
