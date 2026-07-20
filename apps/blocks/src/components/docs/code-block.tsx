'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';

type CodeBlockProps = {
  children: string;
  className?: string;
  label?: string;
};

const iconTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 };

export function CodeBlock({ children, className, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const copyButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      <span className="relative size-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
            transition={iconTransition}
            className="absolute inset-0 flex items-center justify-center"
          >
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );

  return (
    <div
      className={cn(
        'relative min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm',
        className,
      )}
    >
      {label ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
          {copyButton}
        </div>
      ) : (
        <div className="absolute right-1.5 top-1.5 z-10">{copyButton}</div>
      )}
      <pre
        className={cn(
          'overflow-x-auto p-3 font-mono text-[12.5px] leading-6 tabular-nums',
          !label && 'pr-12',
        )}
      >
        <code className="whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}
