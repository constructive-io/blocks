'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from 'next-themes';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';

/** Token-only icon button that toggles light/dark via next-themes.
 *  suppressHydrationWarning-safe: renders nothing until mounted. */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Reserve the same space so layout does not shift on mount.
    return <Button variant="ghost" size="icon" aria-hidden disabled className="opacity-0" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={isDark ? 'light' : 'dark'}
          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className="inline-flex items-center justify-center"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// ThemeControl — the compact 3-way segmented picker (System / Light / Dark) used
// in the right panel and the drawer footer (DESIGN.md §4.6). The active segment
// only lights up after mount (theme is client-only) so the server and first
// client paint agree — no hydration mismatch. Keyboard `T` cycles the theme via
// `useThemeHotkey`, mounted once in the shell.
// ---------------------------------------------------------------------------

const THEME_ORDER = ['system', 'light', 'dark'] as const;
type ThemeValue = (typeof THEME_ORDER)[number];

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Monitor }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme : undefined;

  return (
    <div
      role="group"
      aria-label="Theme"
      title="Cycle theme — T"
      className="inline-flex items-center gap-0.5 rounded-[8px] bg-hover p-0.5"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const on = active === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              'grid size-11 place-items-center rounded-[6px] outline-none transition-[color,background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:size-10 focus-visible:ring-1 focus-visible:ring-ring',
              '[&_svg]:transition-[stroke-width] [&_svg]:duration-[var(--dur-fast)]',
              on ? 'bg-active text-foreground [&_svg]:[stroke-width:2]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}

/** Global `T` shortcut — cycles System → Light → Dark. Mount once (in the shell).
 *  Guarded like ←/→ paging: ignored while typing or inside an interactive widget
 *  that owns its own keys. */
export function useThemeHotkey() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 't') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
      e.preventDefault();
      const i = THEME_ORDER.indexOf((theme as ThemeValue) ?? 'system');
      const next = THEME_ORDER[(i === -1 ? 0 : i + 1) % THEME_ORDER.length];
      setTheme(next);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [theme, setTheme]);
}
