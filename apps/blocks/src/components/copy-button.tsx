'use client';

/**
 * CopyButton — the ghost icon copy control for docs chrome (DESIGN.md §3.3/§7.5).
 *
 * A compact borderless button: muted resting, `hover:bg-hover` + foreground on
 * hover, 1px focus ring. The copy→check swap is a CSS morph (two stacked icons
 * cross-fading with a scale spring-in), reduced-motion aware. Neutral throughout
 * — the morph itself signals success, so no colored glyph.
 *
 * Docs harness only — never imported by block source.
 */

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable (e.g. non-secure context) — no-op.
        }
      }}
      className={cn(
        'group inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none cursor-pointer sm:size-10',
        'transition-[color,background-color,scale] duration-150 ease-out hover:bg-hover hover:text-foreground motion-safe:active:scale-[0.96] motion-reduce:transition-none',
        'focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'copied' : 'copy'}
          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className="inline-flex size-3.5 items-center justify-center"
        >
          {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        </motion.span>
      </AnimatePresence>
      {/* Announce the copy to assistive tech — the icon swap alone is silent.
          role="status" implies aria-live="polite"; the region must exist before
          its text changes, so it's always rendered (empty when idle). */}
      <span role="status" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
