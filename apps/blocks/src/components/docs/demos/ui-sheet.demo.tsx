'use client';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@constructive-io/ui/sheet';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Edit organization</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Organization settings</SheetTitle>
            <SheetDescription>Update the workspace details. Changes apply on save.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Name</Label>
              <Input id="org-name" defaultValue="Acme Corp" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input id="org-slug" defaultValue="acme" />
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button>Save changes</Button>
            </SheetClose>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Demo>
  );
}
