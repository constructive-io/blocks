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
        'group inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none cursor-pointer',
        'transition-[color,background-color] duration-[var(--dur-fast)] hover:bg-hover hover:text-foreground',
        'focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
    >
      {/* Stacked icons — cross-fade + scale so copy morphs into check in place. */}
      <span className="relative inline-flex size-3.5 items-center justify-center transition-transform duration-[var(--dur-fast)] [&_svg]:absolute [&_svg]:size-3.5 motion-safe:group-active:scale-90">
        <Copy
          aria-hidden
          className={cn(
            'transition-[opacity,scale] duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-reduce:transition-none',
            copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Check
          aria-hidden
          className={cn(
            'transition-[opacity,scale] duration-[var(--dur-fast)] ease-[var(--ease-out)] motion-reduce:transition-none',
            copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      </span>
      {/* Announce the copy to assistive tech — the icon swap alone is silent.
          role="status" implies aria-live="polite"; the region must exist before
          its text changes, so it's always rendered (empty when idle). */}
      <span role="status" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
