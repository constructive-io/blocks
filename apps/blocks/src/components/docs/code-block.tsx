'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';
import { highlight } from 'sugar-high';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';

type CodeBlockProps = {
  children: string;
  className?: string;
  label?: string;
  language?: 'tsx';
};

const iconTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 };
const highlightTheme = {
  '--sh-class': 'var(--primary)',
  '--sh-identifier': 'var(--foreground)',
  '--sh-sign': 'var(--muted-foreground)',
  '--sh-property': 'var(--info-foreground)',
  '--sh-entity': 'var(--warning-foreground)',
  '--sh-jsxliterals': 'var(--primary)',
  '--sh-string': 'var(--success-foreground)',
  '--sh-keyword': 'var(--primary)',
  '--sh-comment': 'var(--muted-foreground)',
} as CSSProperties;

export function CodeBlock({ children, className, label, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(
    () => (language === 'tsx' ? highlight(children) : undefined),
    [children, language],
  );

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
      data-slot="code-block"
      className={cn(
        'relative min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm',
        className,
      )}
    >
      {label ? (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
          <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
          <div className="flex shrink-0 items-center gap-1">
            {language ? (
              <span className="px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {language}
              </span>
            ) : null}
            {copyButton}
          </div>
        </div>
      ) : (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-md bg-muted/80 pl-1 backdrop-blur-sm">
          {language ? (
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {language}
            </span>
          ) : null}
          {copyButton}
        </div>
      )}
      <pre
        className={cn(
          'overflow-x-auto p-3 font-mono text-[12.5px] leading-5 tabular-nums',
          !label && 'pr-20',
        )}
      >
        {highlighted ? (
          <code
            className="code-highlight whitespace-pre"
            data-slot="code-block-code"
            data-language={language}
            style={highlightTheme}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code className="whitespace-pre" data-slot="code-block-code">{children}</code>
        )}
      </pre>
    </div>
  );
}
