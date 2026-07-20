'use client';

import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';

import { useInstallMode } from '@/hooks/use-install-mode';
import { type InstallCommand, type InstallMode } from '@/lib/install-mode';
import { cn } from '@/lib/utils';

const iconTransition = { type: 'spring' as const, duration: 0.3, bounce: 0 };

/** Flatten active commands into one clipboard payload */
function formatCommandsForClipboard(commands: InstallCommand[]): string {
  return commands
    .map((command) => {
      if (command.label) return `# ${command.label}\n${command.code}`;
      return command.code;
    })
    .join('\n\n');
}

function TerminalLine({ command }: { command: InstallCommand }) {
  const shell = command.shell !== false && !command.code.includes('\n');
  const isMultiline = command.code.includes('\n');

  return (
    <div className="border-t border-border/70 first:border-t-0">
      {command.label ? (
        <div className="px-3.5 pt-2.5">
          <span className="font-mono text-[11px] text-muted-foreground"># {command.label}</span>
        </div>
      ) : null}

      <div className={cn('flex items-start gap-2 px-3.5', command.label ? 'pb-3 pt-1' : 'py-3')}>
        {shell && !isMultiline ? (
          <span className="select-none font-mono text-[13px] leading-6 text-primary" aria-hidden>
            $
          </span>
        ) : null}
        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[12.5px] leading-6 text-foreground">
          <code className="whitespace-pre">{command.code}</code>
        </pre>
      </div>
    </div>
  );
}

const MODES: { id: InstallMode; label: string; hint: string }[] = [
  { id: 'npm', label: 'npm', hint: '@constructive-io/ui' },
  { id: 'registry', label: 'registry', hint: '@constructive/*' },
];

export type InstallToggleProps = {
  npm: InstallCommand[];
  registry: InstallCommand[];
  /** Optional blurb under the toggle for the active mode */
  descriptions?: Partial<Record<InstallMode, string>>;
  className?: string;
};

export function InstallToggle({ npm, registry, descriptions, className }: InstallToggleProps) {
  const [mode, setMode] = useInstallMode();
  const [copied, setCopied] = useState(false);
  const groupId = useId();
  const commands = mode === 'npm' ? npm : registry;
  const description = descriptions?.[mode];
  const clipboardText = formatCommandsForClipboard(commands);

  async function onCopyAll() {
    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  // Reset copy affordance when switching modes
  useEffect(() => {
    setCopied(false);
  }, [mode]);

  return (
    <div className={cn('min-w-0', className)}>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2 sm:px-2.5">
          <div
            role="tablist"
            aria-label="Install method"
            className="inline-flex rounded-lg bg-muted/70 p-0.5"
          >
            {MODES.map((item) => {
              const active = mode === item.id;
              const index = MODES.indexOf(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${groupId}-${item.id}`}
                  aria-controls={`${groupId}-panel`}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setMode(item.id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | undefined;
                    if (event.key === 'ArrowRight') nextIndex = (index + 1) % MODES.length;
                    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + MODES.length) % MODES.length;
                    if (event.key === 'Home') nextIndex = 0;
                    if (event.key === 'End') nextIndex = MODES.length - 1;
                    if (nextIndex === undefined) return;
                    event.preventDefault();
                    const nextMode = MODES[nextIndex]?.id;
                    if (!nextMode) return;
                    setMode(nextMode);
                    event.currentTarget.parentElement
                      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                      .item(nextIndex)
                      .focus();
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-medium outline-none transition-[background-color,color,box-shadow] duration-150 ease-out',
                    'focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <span className="min-w-0 flex-1" />
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            {MODES.find((m) => m.id === mode)?.hint}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={onCopyAll}
            aria-label={copied ? 'Copied all commands' : 'Copy all commands'}
          >
            <span className="relative size-3.5 shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? 'check' : 'copy'}
                  initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                  transition={iconTransition}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-[12px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>

        {description ? (
          <p className="border-b border-border px-3.5 py-2.5 text-pretty text-[13px] leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div
          id={`${groupId}-panel`}
          role="tabpanel"
          aria-labelledby={`${groupId}-${mode}`}
          className="min-w-0 bg-muted/30"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            >
              {commands.map((command, index) => (
                <TerminalLine key={`${mode}-${command.label ?? ''}-${index}`} command={command} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
