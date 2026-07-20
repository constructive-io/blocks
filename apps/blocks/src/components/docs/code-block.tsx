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

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-card',
        className,
      )}
    >
      {label ? (
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      ) : null}
      <div className="relative">
        <pre className="overflow-x-auto p-4 pr-14 font-mono text-sm leading-6 tabular-nums">
          <code>{children}</code>
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1.5 top-1.5 size-10 pointer-coarse:size-11"
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
      </div>
    </div>
  );
}
