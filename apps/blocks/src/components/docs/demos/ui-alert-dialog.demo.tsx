'use client';

import { useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicAlertDialogDemo() {
  return (
    <Demo>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>Delete database</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete production-db?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the database and all of its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction render={<Button variant="destructive" />}>Delete database</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Demo>
  );
}

export function ControlledAlertDialogDemo() {
  const [open, setOpen] = useState(false);
  const [databaseName, setDatabaseName] = useState('');
  const confirmed = databaseName === 'production-db';

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setDatabaseName('');
  }

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger render={<Button variant="destructive" />}>Reset database</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset production-db?</AlertDialogTitle>
              <AlertDialogDescription>
                Enter production-db to confirm. The reset removes every table and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="alert-dialog-database-name">Database name</Label>
              <Input
                id="alert-dialog-database-name"
                value={databaseName}
                onChange={(event) => setDatabaseName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction render={<Button variant="destructive" disabled={!confirmed} />}>
                Reset database
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Confirmation is {open ? 'open' : 'closed'}.
        </p>
      </div>
    </Demo>
  );
}

export function SafeInitialFocusAlertDialogDemo() {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Demo>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" />}>Replace primary region</AlertDialogTrigger>
        <AlertDialogContent initialFocus={cancelRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the primary region?</AlertDialogTitle>
            <AlertDialogDescription>
              Connections may be interrupted while the new primary becomes available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelRef}>Keep current region</AlertDialogCancel>
            <AlertDialogAction>Replace region</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Demo>
  );
}

export function ComposedAlertDialogDemo() {
  return (
    <Demo>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" />}>Discard migration draft</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved migration steps will be removed. The deployed schema is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="ghost" />}>Continue editing</AlertDialogCancel>
            <AlertDialogAction render={<Button variant="destructive" />}>Discard draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicAlertDialogDemo />;
}
