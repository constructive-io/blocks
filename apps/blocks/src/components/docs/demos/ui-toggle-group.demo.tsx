'use client';

import { useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicToggleGroupDemo() {
  return (
    <Demo>
      <ToggleGroup defaultValue={['24h']} aria-label="Metrics window">
        <ToggleGroupItem value="1h">1h</ToggleGroupItem>
        <ToggleGroupItem value="24h">24h</ToggleGroupItem>
        <ToggleGroupItem value="7d">7d</ToggleGroupItem>
        <ToggleGroupItem value="30d">30d</ToggleGroupItem>
      </ToggleGroup>
    </Demo>
  );
}

export function ToggleGroupMultipleDemo() {
  const [value, setValue] = useState<string[]>(['errors']);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-2">
        <ToggleGroup multiple value={value} onValueChange={setValue} aria-label="Log streams to show">
          <ToggleGroupItem value="errors">Errors</ToggleGroupItem>
          <ToggleGroupItem value="warnings">Warnings</ToggleGroupItem>
          <ToggleGroupItem value="info">Info</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">Showing {value.length ? value.join(', ') : 'nothing'}.</p>
      </div>
    </Demo>
  );
}

export function ToggleGroupSpacingDemo() {
  return (
    <Demo>
      <ToggleGroup spacing={4} defaultValue={['left']} aria-label="Text alignment">
        <ToggleGroupItem value="left" aria-label="Align left">
          <AlignLeft className="size-4" aria-hidden />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center">
          <AlignCenter className="size-4" aria-hidden />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right">
          <AlignRight className="size-4" aria-hidden />
        </ToggleGroupItem>
      </ToggleGroup>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicToggleGroupDemo />;
}
