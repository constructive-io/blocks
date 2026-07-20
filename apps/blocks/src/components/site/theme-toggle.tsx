'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@constructive-io/ui/button';

const iconTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 };

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        disabled
        className="size-10 pointer-coarse:size-11"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 pointer-coarse:size-11"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="relative size-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={iconTransition}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}
