'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@constructive-io/ui/tooltip';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicTooltipDemo() {
  return (
    <Demo>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Create database" />}>
            <Plus aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Create database</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Demo>
  );
}

export function PositionedTooltipDemo() {
  return (
    <Demo>
      <TooltipProvider delay={250}>
        <div className="flex flex-wrap justify-center gap-3">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Tooltip key={side}>
              <TooltipTrigger render={<Button variant="outline" size="sm" />}>{side}</TooltipTrigger>
              <TooltipContent side={side} showArrow>{side} hint</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </Demo>
  );
}

export function ControlledTooltipDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <TooltipProvider>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger render={<Button variant="outline" />}>Backup schedule</TooltipTrigger>
            <TooltipContent>Nightly at 02:00 UTC</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button size="sm" variant="ghost" onClick={() => setOpen((current) => !current)}>
          {open ? 'Hide hint' : 'Show hint'}
        </Button>
      </div>
    </Demo>
  );
}

export function DisabledTriggerTooltipDemo() {
  return (
    <Demo>
      <TooltipProvider>
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  aria-label="Deploy unavailable"
                  aria-disabled="true"
                  className="inline-flex"
                  tabIndex={0}
                />
              }
            >
              <Button disabled>Deploy</Button>
            </TooltipTrigger>
            <TooltipContent>Resolve validation errors before deploying</TooltipContent>
          </Tooltip>
          <p className="text-pretty text-sm text-muted-foreground">
            Resolve validation errors before deploying.
          </p>
        </div>
      </TooltipProvider>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicTooltipDemo />;
}
