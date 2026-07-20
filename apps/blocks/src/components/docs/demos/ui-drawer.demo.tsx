'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@constructive-io/ui/drawer';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@constructive-io/ui/popover';

import { Demo } from '@/components/docs/showcase-kit';

const DRAWER_DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const;
const SNAP_POINTS: (number | string)[] = [0.35, 0.7, 1];

type DrawerDirection = (typeof DRAWER_DIRECTIONS)[number];

function DirectionDrawer({ direction }: { direction: DrawerDirection }) {
  const horizontal = direction === 'left' || direction === 'right';

  return (
    <Drawer direction={direction}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline" className="capitalize">
          {direction}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className={horizontal ? 'w-80 max-w-[85vw]' : 'mx-auto w-full max-w-sm'}>
          <DrawerHeader>
            <DrawerTitle className="capitalize">{direction} drawer</DrawerTitle>
            <DrawerDescription>The drawer enters from the {direction} edge.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function BasicDrawerDemo() {
  return (
    <Demo>
      <Drawer autoFocus>
        <DrawerTrigger asChild>
          <Button variant="outline">Open quick actions</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Quick actions</DrawerTitle>
              <DrawerDescription>Run a task on production-db. Swipe down or use Close when finished.</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-2 px-4">
              <Button variant="outline" className="justify-start">Run migration</Button>
              <Button variant="outline" className="justify-start">Create backup</Button>
              <Button variant="outline" className="justify-start">Invalidate cache</Button>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Demo>
  );
}

export function ControlledDrawerDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline">Review deployment</Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>Deployment ready</DrawerTitle>
                <DrawerDescription>Version 2.4.0 passed every production check.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button onClick={() => setOpen(false)}>Deploy now</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Not now</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Drawer is {open ? 'open' : 'closed'}.
        </p>
      </div>
    </Demo>
  );
}

export function DrawerDirectionsDemo() {
  return (
    <Demo>
      <div className="flex flex-wrap justify-center gap-2">
        {DRAWER_DIRECTIONS.map((direction) => (
          <DirectionDrawer key={direction} direction={direction} />
        ))}
      </div>
    </Demo>
  );
}

export function SnapPointDrawerDemo() {
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(SNAP_POINTS[0]);

  return (
    <Demo>
      <Drawer
        snapPoints={SNAP_POINTS}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
        fadeFromIndex={2}
      >
        <DrawerTrigger asChild>
          <Button variant="outline">Inspect query</Button>
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <div className="mx-auto flex h-full w-full max-w-sm flex-col">
            <DrawerHeader>
              <DrawerTitle>Query details</DrawerTitle>
              <DrawerDescription>Drag between the summary, plan, and full query snap points.</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 overflow-y-auto px-4 text-sm">
              <div className="rounded-lg border p-3">
                <p className="font-medium">Duration</p>
                <p className="mt-1 text-muted-foreground">184 ms</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">Plan</p>
                <p className="mt-1 text-muted-foreground">Index scan on events_created_at_idx</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">Query</p>
                <code className="mt-1 block text-muted-foreground">select * from events order by created_at desc</code>
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button>Done</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Demo>
  );
}

export function NestedOverlayDrawerDemo() {
  return (
    <Demo>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Configure backup</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Backup schedule</DrawerTitle>
              <DrawerDescription>Choose when production-db creates its daily snapshot.</DrawerDescription>
            </DrawerHeader>
            <div className="flex items-center justify-between gap-4 px-4">
              <div>
                <p className="text-sm font-medium">Run time</p>
                <p className="text-sm text-muted-foreground">02:00 UTC</p>
              </div>
              <Popover>
                <PopoverTrigger render={<Button size="sm" variant="outline" />}>Change</PopoverTrigger>
                <PopoverContent align="end" className="w-60">
                  <PopoverTitle>Backup window</PopoverTitle>
                  <PopoverDescription className="mt-1">Use the lowest-traffic period for this database.</PopoverDescription>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <PopoverClose render={<Button size="sm" variant="outline" />}>01:00</PopoverClose>
                    <PopoverClose render={<Button size="sm" />}>02:00</PopoverClose>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button>Save schedule</Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicDrawerDemo />;
}
