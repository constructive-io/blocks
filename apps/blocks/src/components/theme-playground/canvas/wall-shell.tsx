import type { CSSProperties, ReactNode } from 'react';
import { Bell, Plus, Search } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';

import { cn } from '@/lib/utils';
import type { WallId } from '@/lib/theme-playground/walls';

export function PreviewTopBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-6 backdrop-blur-md">
      <span className="text-sm font-semibold tracking-tight">Constructive</span>
      <Badge variant="secondary">Preview</Badge>
      <div className="relative ml-auto hidden w-48 sm:block">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input aria-label="Search preview" placeholder="Search" className="h-8 pl-8 text-xs" />
      </div>
      <Button variant="ghost" size="icon" aria-label="Notifications" className="ml-auto sm:ml-0">
        <Bell aria-hidden />
      </Button>
      <Button size="sm" aria-label="New project">
        <Plus aria-hidden />
        <span className="hidden sm:inline">New project</span>
      </Button>
    </div>
  );
}

/** Skips render work for off-viewport columns on the wall. */
export const COLUMN_CLASS = 'flex flex-col gap-6 [content-visibility:auto] [contain-intrinsic-size:352px_1400px]';
export const WIDE_COLUMN_CLASS =
  'col-span-2 flex flex-col gap-6 [content-visibility:auto] [contain-intrinsic-size:728px_1400px]';
/** A stack inside the wide column — cards flow independently of the neighbouring stack. */
export const SUBCOLUMN_CLASS = 'flex min-w-0 flex-col gap-6';

/** Per-column entrance delay — cards read it through `animate-fade-up`. */
export const stagger = (index: number) => ({ '--stagger': index }) as CSSProperties;

/** Fixed-width wall — columns stay stable while the viewport scrolls. */
export function WallShell({ wall, tracks, children }: { wall: WallId; tracks: string; children: ReactNode }) {
  return (
    <div data-wall={wall} className="min-h-dvh bg-background text-foreground">
      <PreviewTopBar />
      <main className={cn('grid w-max items-start gap-6 px-8 pb-10 pt-20', tracks)}>{children}</main>
    </div>
  );
}
