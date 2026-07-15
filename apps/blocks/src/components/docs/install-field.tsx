'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { installCommand, usePm } from '@/lib/pm-context';

/**
 * InstallField (DESIGN.md §7.3) — FF's InputCopy, focused for install commands.
 * The whole field is the copy button: a mono value under a `<mark>` that washes
 * Constructive-blue on hover, plus a copy→check icon morph. Renders through the
 * package-manager context, so passing `url` re-computes the command whenever the
 * reader switches package managers. Pass `command` for a literal one-liner.
 */

// execCommand fallback for when the async Clipboard API is unavailable or denied
// (insecure context, permissions policy) — copies via a temporary off-screen
// textarea.
function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

interface InstallFieldProps {
  /** Registry item URL — rendered as `<pm> add <url>` through the pm context. */
  url?: string;
  /** Literal command string — used verbatim (takes precedence over `url`). */
  command?: string;
  /** `left` places the copy action before the value (step-list variant). */
  align?: 'left' | 'right';
  className?: string;
}

export function InstallField({ url, command, align = 'right', className }: InstallFieldProps) {
  const { pm } = usePm();
  const value = command ?? (url ? installCommand(pm, url) : '');

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    let ok = true;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      ok = copyViaExecCommand(value);
    }
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const valueEl = (
    <span
      className={cn(
        'min-w-0 flex-1 truncate py-2 text-left font-mono text-[13px] text-foreground',
        align === 'left' ? 'pl-1' : 'pl-0'
      )}
    >
      <mark className="bg-transparent text-foreground transition-colors duration-[var(--dur-fast)] group-hover:bg-primary/15 group-active:bg-primary/25">
        {value}
      </mark>
    </span>
  );

  const iconEl = (
    <span className="shrink-0 px-1.5 py-2 text-muted-foreground transition-colors duration-[var(--dur-fast)] group-hover:text-foreground">
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="flex items-center justify-center"
          >
            <Check
              size={14}
              strokeWidth={1.5}
              className="transition-[stroke-width] duration-[var(--dur-fast)] group-hover:[stroke-width:2]"
            />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className="flex items-center justify-center"
          >
            <Copy
              size={14}
              strokeWidth={1.5}
              className="transition-[stroke-width] duration-[var(--dur-fast)] group-hover:[stroke-width:2]"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy install command'}
      className={cn(
        'group flex min-h-11 min-w-0 max-w-full w-full cursor-pointer items-center overflow-hidden rounded-lg outline-none transition-transform duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:min-h-10 focus-visible:ring-1 focus-visible:ring-ring',
        className
      )}
    >
      {align === 'left' ? (
        <>
          {iconEl}
          {valueEl}
        </>
      ) : (
        <>
          {valueEl}
          {iconEl}
        </>
      )}
    </button>
  );
}

export type { InstallFieldProps };
export default InstallField;
