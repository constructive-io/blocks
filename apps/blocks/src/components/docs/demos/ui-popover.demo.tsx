'use client';

import { useState } from 'react';
import { Settings2, X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@constructive-io/ui/popover';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicPopoverDemo() {
  return (
    <Demo>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          <Settings2 aria-hidden="true" data-icon="inline-start" />
          Connection limits
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <PopoverTitle>Connection limits</PopoverTitle>
              <PopoverDescription>Tune the pool for this database.</PopoverDescription>
            </div>
            <PopoverClose
              render={<Button variant="ghost" size="icon-sm" aria-label="Close connection limits" />}
            >
              <X aria-hidden="true" />
            </PopoverClose>
          </div>
          <div className="mt-4 grid gap-2">
            <div className="grid grid-cols-3 items-center gap-3">
              <Label htmlFor="popover-max">Max</Label>
              <Input id="popover-max" defaultValue="20" className="col-span-2" />
            </div>
            <div className="grid grid-cols-3 items-center gap-3">
              <Label htmlFor="popover-idle">Idle (s)</Label>
              <Input id="popover-idle" defaultValue="300" className="col-span-2" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </Demo>
  );
}

export function ControlledPopoverDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="outline" />}>Deployment details</PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>Deployment details</PopoverTitle>
            <PopoverDescription className="mt-1">Production is healthy in us-east-1.</PopoverDescription>
            <PopoverClose render={<Button size="sm" className="mt-4" />}>Done</PopoverClose>
          </PopoverContent>
        </Popover>
        <p className="text-pretty text-sm text-muted-foreground">Popover is {open ? 'open' : 'closed'}.</p>
      </div>
    </Demo>
  );
}

export function PositionedPopoverDemo() {
  return (
    <Demo>
      <div className="flex flex-wrap justify-center gap-3">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Popover key={side}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>{side}</PopoverTrigger>
            <PopoverContent side={side} showArrow className="w-52">
              <PopoverTitle className="capitalize">{side} placement</PopoverTitle>
              <PopoverDescription className="mt-1">The arrow follows the trigger position.</PopoverDescription>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicPopoverDemo />;
}
