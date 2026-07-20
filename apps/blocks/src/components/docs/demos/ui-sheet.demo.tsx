'use client';

import { useState } from 'react';

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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetStackProvider,
  SheetTitle,
  SheetTrigger,
  useSheet,
} from '@constructive-io/ui/sheet';

import { Demo } from '@/components/docs/showcase-kit';

const SHEET_SIDES = ['top', 'right', 'bottom', 'left'] as const;

type SheetSide = (typeof SHEET_SIDES)[number];

function SideSheet({ side }: { side: SheetSide }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" className="capitalize" />}>
        {side}
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle className="capitalize">{side} sheet</SheetTitle>
          <SheetDescription>The panel enters from the {side} edge.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SheetLayerStatus() {
  const { depth, sheetsAbove, isTopSheet } = useSheet();

  return (
    <p className="text-sm text-muted-foreground">
      Layer {depth + 1}; {sheetsAbove} above; {isTopSheet ? 'top sheet' : 'pushed sheet'}.
    </p>
  );
}

export function BasicSheetDemo() {
  return (
    <Demo>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>Edit organization</SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Organization settings</SheetTitle>
            <SheetDescription>Update the workspace details. Changes apply on save.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sheet-organization-name">Name</Label>
              <Input id="sheet-organization-name" defaultValue="Acme Corp" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sheet-organization-slug">Slug</Label>
              <Input id="sheet-organization-slug" defaultValue="acme" />
            </div>
          </div>
          <SheetFooter>
            <SheetClose render={<Button />}>Save changes</SheetClose>
            <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Demo>
  );
}

export function ControlledSheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" />}>Invite member</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Invite member</SheetTitle>
              <SheetDescription>Send access to the production workspace.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="sheet-member-email">Email address</Label>
              <Input id="sheet-member-email" type="email" placeholder="engineer@example.com" />
            </div>
            <SheetFooter>
              <Button onClick={() => setOpen(false)}>Send invitation</Button>
              <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Sheet is {open ? 'open' : 'closed'}.
        </p>
      </div>
    </Demo>
  );
}

export function SheetSidesDemo() {
  return (
    <Demo>
      <div className="flex flex-wrap justify-center gap-2">
        {SHEET_SIDES.map((side) => (
          <SideSheet key={side} side={side} />
        ))}
      </div>
    </Demo>
  );
}

export function StackedSheetDemo() {
  return (
    <Demo>
      <SheetStackProvider stackMode="cascade">
        <Sheet sheetId="organization-settings">
          <SheetTrigger render={<Button variant="outline" />}>Manage organization</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Organization settings</SheetTitle>
              <SheetDescription>Manage workspace membership and access.</SheetDescription>
            </SheetHeader>
            <SheetLayerStatus />
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Avery Stone</p>
              <p className="text-sm text-muted-foreground">avery@example.com · Administrator</p>
              <Sheet sheetId="member-settings">
                <SheetTrigger render={<Button size="sm" variant="outline" className="mt-3" />}>
                  Edit member
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Edit member</SheetTitle>
                    <SheetDescription>Change Avery’s organization access.</SheetDescription>
                  </SheetHeader>
                  <SheetLayerStatus />
                  <div className="grid gap-2 py-2">
                    <Label htmlFor="sheet-member-role">Role</Label>
                    <Input id="sheet-member-role" defaultValue="Administrator" />
                  </div>
                  <SheetFooter>
                    <SheetClose render={<Button />}>Save member</SheetClose>
                    <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>Close settings</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </SheetStackProvider>
    </Demo>
  );
}

export function NestedOverlaySheetDemo() {
  return (
    <Demo>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>Edit environment</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Production environment</SheetTitle>
            <SheetDescription>Configure the deployment target and region.</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Region</p>
              <p className="text-sm text-muted-foreground">us-east-1</p>
            </div>
            <Popover>
              <PopoverTrigger render={<Button size="sm" variant="outline" />}>Change</PopoverTrigger>
              <PopoverContent align="end" className="w-60">
                <PopoverTitle>Deployment region</PopoverTitle>
                <PopoverDescription className="mt-1">Choose the closest region to your users.</PopoverDescription>
                <div className="mt-3 grid gap-2">
                  <PopoverClose render={<Button size="sm" variant="outline" />}>us-west-2</PopoverClose>
                  <PopoverClose render={<Button size="sm" />}>us-east-1</PopoverClose>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <SheetFooter>
            <SheetClose render={<Button />}>Save environment</SheetClose>
            <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Demo>
  );
}

export function CustomSheetControlsDemo() {
  return (
    <Demo>
      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>View API key</SheetTrigger>
        <SheetContent showClose={false} transition={{ duration: 0.18 }}>
          <SheetHeader>
            <SheetTitle>Production API key</SheetTitle>
            <SheetDescription>Store this key in a secret manager and do not commit it.</SheetDescription>
          </SheetHeader>
          <code className="overflow-x-auto rounded-lg bg-muted p-3 text-sm">sk_live_••••••••••••</code>
          <SheetFooter>
            <SheetClose render={<Button />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicSheetDemo />;
}
