import { FileText, Upload } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@constructive-io/ui/item';
import { Progress } from '@constructive-io/ui/progress';

import { SinkCard } from './sink-card';

export function UploadAssetsCard() {
  return (
    <SinkCard title="Upload assets" description="Drag and drop or browse" contentClassName="flex flex-col gap-3">
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
        <Upload className="mx-auto size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-[13px] font-medium">Drop files here</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">SVG, PNG, PDF up to 25 MB</p>
        <Button variant="outline" size="sm" className="mt-3">
          Browse files
        </Button>
      </div>
      <Item variant="muted" size="sm" className="flex-wrap">
        <ItemMedia variant="icon">
          <FileText aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="truncate">brand-guidelines.pdf</ItemTitle>
          <ItemDescription>2.1 MB · uploading</ItemDescription>
        </ItemContent>
        <span className="text-[12px] font-medium tabular-nums">64%</span>
        <Progress value={64} aria-label="brand-guidelines.pdf upload progress" className="h-1.5 w-full" />
      </Item>
    </SinkCard>
  );
}
