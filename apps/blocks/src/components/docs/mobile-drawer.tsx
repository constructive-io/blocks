'use client';

import { Dialog } from '@base-ui/react/dialog';

import { GitHubChip, SettingsRows } from './right-panel';
import { Sidebar } from './sidebar';

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Mobile navigation drawer (DESIGN.md §4.1) — a left sheet on Base UI's Dialog
 * (focus trap, scroll lock, ESC + backdrop dismiss handled by the primitive).
 * Slides in on `--ease-drawer`; the backdrop fades. Both honor
 * `prefers-reduced-motion`. Since the topbar retired, the footer carries the
 * theme + package-manager rows (the same "Make it yours" controls as the right
 * panel). Safe-area insets pad the panel.
 */
export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-out)] data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-background shadow-surface-6 outline-none transition-transform duration-[var(--dur-slow)] ease-[var(--ease-drawer)] data-starting-style:-translate-x-full data-ending-style:-translate-x-full motion-reduce:transition-none"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Dialog.Title className="sr-only">Registry navigation</Dialog.Title>
          <Dialog.Description className="sr-only">Browse blocks, UI components, flows and guides.</Dialog.Description>

          <Sidebar mobile onNavigate={() => onOpenChange(false)} />

          <div className="border-t border-border/60 p-4">
            <div className="flex items-center justify-between pb-1 pl-1">
              <h2 className="text-[16px] font-semibold leading-none text-foreground">Make it yours</h2>
              <GitHubChip />
            </div>
            <SettingsRows />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MobileDrawer;
