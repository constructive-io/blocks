import * as React from 'react';
import { formatKeyBinding, type KeyBinding } from '@constructive-io/command-palette';
import { cn } from '@/lib/utils';

export interface KbdShortcutProps {
  binding: KeyBinding;
  className?: string;
}

/**
 * Renders a KeyBinding as individual `<kbd>` elements (Raycast-style).
 *
 * Example: `⌘` `H` — each key is a separate styled box.
 */
export function KbdShortcut({ binding, className }: KbdShortcutProps) {
  const keys = formatKeyBinding(binding);

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border bg-muted px-1 text-[11px] font-medium text-muted-foreground"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
