'use client';

import { useState } from 'react';
import { Bold, Italic, Pin, Underline } from 'lucide-react';

import { Toggle } from '@constructive-io/ui/toggle';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicToggleDemo() {
  return (
    <Demo>
      <Toggle aria-label="Pin filter">
        <Pin className="size-4" aria-hidden />
      </Toggle>
    </Demo>
  );
}

export function ControlledToggleDemo() {
  const [pressed, setPressed] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-2">
        <Toggle variant="outline" pressed={pressed} onPressedChange={setPressed} aria-label="Watch deployments">
          Watch deployments
        </Toggle>
        <p className="text-sm text-muted-foreground">
          {pressed ? 'Watching this project for new deploys.' : 'Not watching.'}
        </p>
      </div>
    </Demo>
  );
}

export function ToggleToolbarDemo() {
  return (
    <Demo>
      <div className="flex items-center gap-1 rounded-md border bg-background p-1">
        <Toggle size="sm" aria-label="Bold" defaultPressed>
          <Bold className="size-4" aria-hidden />
        </Toggle>
        <Toggle size="sm" aria-label="Italic">
          <Italic className="size-4" aria-hidden />
        </Toggle>
        <Toggle size="sm" aria-label="Underline">
          <Underline className="size-4" aria-hidden />
        </Toggle>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <ToggleToolbarDemo />;
}
