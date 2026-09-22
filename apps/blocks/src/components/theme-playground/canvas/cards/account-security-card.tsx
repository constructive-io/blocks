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
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';

import { SinkCard } from './sink-card';

export function AccountSecurityCard() {
  return (
    <SinkCard
      title="Account security"
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <Button size="sm">Update</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive-outline">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the workspace, its schemas and all data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    >
      <Field label="Current password" htmlFor="sink-pw-current">
        <Input id="sink-pw-current" type="password" autoComplete="current-password" placeholder="••••••••" />
      </Field>
      <Field label="New password" htmlFor="sink-pw-new">
        <Input id="sink-pw-new" type="password" autoComplete="new-password" placeholder="••••••••" />
      </Field>
    </SinkCard>
  );
}
