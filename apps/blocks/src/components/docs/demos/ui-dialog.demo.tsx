'use client';

import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@constructive-io/ui/dialog';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Rename database</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename database</DialogTitle>
            <DialogDescription>
              Choose a new name. Existing connections keep working.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-6 py-2">
            <Label htmlFor="db-name">Name</Label>
            <Input id="db-name" defaultValue="production-db" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Save changes</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Demo>
  );
}
