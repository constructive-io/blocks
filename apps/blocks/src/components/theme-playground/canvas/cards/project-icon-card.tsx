import { ImageIcon, X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Label } from '@constructive-io/ui/label';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@constructive-io/ui/item';

import { SinkCard } from './sink-card';

export function ProjectIconCard() {
  return (
    <SinkCard title="Project icon" description="Shown in the console and CLI." contentClassName="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex size-24 shrink-0 items-center justify-center rounded-md text-xl font-semibold tracking-tight outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          style={{
            background: 'color-mix(in oklch, var(--chart-1) 14%, var(--card))',
            color: 'var(--chart-1)',
          }}
        >
          AC
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label>Upload</Label>
          <Button variant="outline" size="sm" className="self-start">
            Choose file…
          </Button>
          <p className="text-[11px] text-subtle-foreground">PNG or SVG · 512×512 · &lt; 1 MB</p>
        </div>
      </div>
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <ImageIcon aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>acme-mark.svg</ItemTitle>
          <ItemDescription>24 KB · uploaded 2 days ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm" aria-label="Remove acme-mark.svg">
            <X aria-hidden />
          </Button>
        </ItemActions>
      </Item>
    </SinkCard>
  );
}
