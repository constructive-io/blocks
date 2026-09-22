'use client';

import { Kbd, KbdGroup } from '@constructive-io/ui/kbd';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicKbdDemo() {
  return (
    <Demo>
      <p className="text-sm text-muted-foreground">
        Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the command palette.
      </p>
    </Demo>
  );
}

export function KbdShortcutsDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-xs flex-col gap-2.5 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between text-sm">
          <span>Command palette</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Save changes</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>S</Kbd>
          </KbdGroup>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Toggle sidebar</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>B</Kbd>
          </KbdGroup>
        </div>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <KbdShortcutsDemo />;
}
