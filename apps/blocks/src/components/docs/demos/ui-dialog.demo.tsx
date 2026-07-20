'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
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

const DATABASE_PERMISSIONS = [
  ['Read rows', 'Query tables and views.'],
  ['Write rows', 'Insert and update records.'],
  ['Manage schema', 'Create and alter database objects.'],
  ['Manage backups', 'Create and restore snapshots.'],
  ['Manage users', 'Invite members and change roles.'],
] as const;

export function BasicDialogDemo() {
  return (
    <Demo>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Rename database</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename database</DialogTitle>
            <DialogDescription>Choose a new name. Existing connections keep working.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-6 py-2">
            <Label htmlFor="dialog-database-name">Name</Label>
            <Input id="dialog-database-name" defaultValue="production-db" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <DialogClose render={<Button />}>Save changes</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Demo>
  );
}

export function ControlledDialogDemo() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState('us-east-1');

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" />}>Move database</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move database</DialogTitle>
              <DialogDescription>Choose the destination region for production-db.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 px-6 py-2">
              <Label htmlFor="dialog-region">Region</Label>
              <Input id="dialog-region" value={region} onChange={(event) => setRegion(event.target.value)} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={() => setOpen(false)}>Schedule move</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Dialog is {open ? 'open' : 'closed'}; destination is {region}.
        </p>
      </div>
    </Demo>
  );
}

export function ScrollableDialogDemo() {
  return (
    <Demo>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Review role</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Database administrator</DialogTitle>
            <DialogDescription>Review the permissions included in this role before assigning it.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="grid gap-3">
              {DATABASE_PERMISSIONS.map(([name, description]) => (
                <div key={name} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <DialogClose render={<Button />}>Assign role</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Demo>
  );
}

export function NestedOverlayDialogDemo() {
  return (
    <Demo>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Create connection</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create connection</DialogTitle>
            <DialogDescription>Configure how the application connects to production-db.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 px-6 py-2">
            <div>
              <p className="text-sm font-medium">Connection pool</p>
              <p className="text-sm text-muted-foreground">20 active connections</p>
            </div>
            <Popover>
              <PopoverTrigger render={<Button size="sm" variant="outline" />}>Configure</PopoverTrigger>
              <PopoverContent align="end">
                <PopoverTitle>Connection pool</PopoverTitle>
                <PopoverDescription className="mt-1">Set the maximum number of active connections.</PopoverDescription>
                <div className="mt-4 grid gap-2">
                  <Label htmlFor="dialog-pool-size">Maximum connections</Label>
                  <Input id="dialog-pool-size" defaultValue="20" inputMode="numeric" />
                </div>
                <PopoverClose render={<Button size="sm" className="mt-4" />}>Apply</PopoverClose>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <DialogClose render={<Button />}>Create connection</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Demo>
  );
}

export function CustomDialogChromeDemo() {
  return (
    <Demo>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>View connection string</DialogTrigger>
        <DialogPopup showCloseButton={false} bottomStickOnMobile={false}>
          <DialogHeader>
            <DialogTitle>Connection string</DialogTitle>
            <DialogDescription>Copy this value into the application environment.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <code className="block overflow-x-auto rounded-lg bg-muted p-3 text-sm">
              postgres://app@production-db/main
            </code>
          </div>
          <DialogFooter variant="bare">
            <DialogClose render={<Button />}>Done</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicDialogDemo />;
}
