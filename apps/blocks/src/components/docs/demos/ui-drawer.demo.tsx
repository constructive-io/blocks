'use client';

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

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Open quick actions</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Quick actions</DrawerTitle>
              <DrawerDescription>Run a task on production-db. Swipe down to dismiss.</DrawerDescription>
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
