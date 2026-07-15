'use client';

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

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete database</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete production-db?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the database and all of its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Demo>
  );
}
