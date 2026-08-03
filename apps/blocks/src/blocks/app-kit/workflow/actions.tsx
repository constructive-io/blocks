'use client';

import * as React from 'react';
import { LoaderCircleIcon, MoreHorizontalIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle
} from '@constructive-io/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';

export type AppActionOutcome =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: string }>;

export interface AppActionConfirmation {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export interface AppActionItem {
  id: string;
  label: string;
  description?: string;
  disabledReason?: string;
  confirmation?: AppActionConfirmation;
  execute: () => void | AppActionOutcome | Promise<void | AppActionOutcome>;
}

function normalizeOutcome(value: void | AppActionOutcome): AppActionOutcome {
  return value ?? { ok: true };
}

async function invokeAction(action: AppActionItem): Promise<AppActionOutcome> {
  try {
    return normalizeOutcome(await action.execute());
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The action could not be completed.'
    };
  }
}

function InlineActionError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Action failed</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

interface AppActionConfirmationDialogProps {
  action: AppActionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function AppActionConfirmationDialog({
  action,
  open,
  onOpenChange,
  onComplete
}: AppActionConfirmationDialogProps) {
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const [error, setError] = React.useState<string | null>(null);
  const confirmation = action.confirmation;
  if (!confirmation) return null;

  const confirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const outcome = await invokeAction(action);
    pendingRef.current = false;
    setPending(false);
    if (outcome.ok) {
      onOpenChange(false);
      onComplete?.();
    } else {
      setError(outcome.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (!pending) {
        setError(null);
        onOpenChange(next);
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <InlineActionError message={error} /> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => void confirm()}
            variant={confirmation.destructive ? 'destructive' : 'default'}
          >
            {pending ? <LoaderCircleIcon className="motion-safe:animate-spin" data-icon="inline-start" /> : null}
            {confirmation.confirmLabel ?? action.label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface AppActionButtonProps {
  action: AppActionItem;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
}

/** A controlled action button with local progress, confirmation, and errors. */
export function AppActionButton({ action, size, variant }: AppActionButtonProps) {
  const disabledReasonId = React.useId();
  const [confirmationOpen, setConfirmationOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    if (action.confirmation) {
      setConfirmationOpen(true);
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const outcome = await invokeAction(action);
    pendingRef.current = false;
    setPending(false);
    if (!outcome.ok) setError(outcome.error);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        aria-describedby={action.disabledReason ? disabledReasonId : undefined}
        disabled={pending || Boolean(action.disabledReason)}
        onClick={() => void run()}
        size={size}
        variant={variant ?? (action.confirmation?.destructive ? 'destructive' : 'default')}
      >
        {pending ? <LoaderCircleIcon className="motion-safe:animate-spin" data-icon="inline-start" /> : null}
        {action.label}
      </Button>
      {action.disabledReason ? (
        <p className="text-muted-foreground text-pretty text-xs" id={disabledReasonId}>
          {action.disabledReason}
        </p>
      ) : null}
      {error ? <InlineActionError message={error} /> : null}
      <AppActionConfirmationDialog
        action={action}
        onOpenChange={setConfirmationOpen}
        open={confirmationOpen}
      />
    </div>
  );
}

export interface AppActionMenuProps {
  actions: readonly AppActionItem[];
  label?: string;
  onActionComplete?: (actionId: string) => void;
}

export function AppActionMenu({
  actions,
  label = 'More actions',
  onActionComplete
}: AppActionMenuProps) {
  const [selected, setSelected] = React.useState<AppActionItem | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null);
  const pendingRef = React.useRef(false);

  const select = async (action: AppActionItem) => {
    if (action.confirmation) {
      setSelected(action);
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingActionId(action.id);
    setError(null);
    const outcome = await invokeAction(action);
    pendingRef.current = false;
    setPendingActionId(null);
    if (outcome.ok) onActionComplete?.(action.id);
    else setError(outcome.error);
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={label} disabled={Boolean(pendingActionId)} size="icon-sm" variant="outline">
            {pendingActionId ? (
              <LoaderCircleIcon className="motion-safe:animate-spin" />
            ) : (
              <MoreHorizontalIcon />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {actions.map((action) => (
              <DropdownMenuItem
                disabled={Boolean(action.disabledReason)}
                key={action.id}
                onClick={() => void select(action)}
                variant={action.confirmation?.destructive ? 'destructive' : 'default'}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <InlineActionError message={error} /> : null}
      {selected ? (
        <AppActionConfirmationDialog
          action={selected}
          onComplete={() => onActionComplete?.(selected.id)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          open
        />
      ) : null}
    </div>
  );
}

export interface AppActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  confirmation?: AppActionConfirmation;
  disabledReason?: string;
  children: React.ReactNode;
  onSubmit: () => void | AppActionOutcome | Promise<void | AppActionOutcome>;
}

/** Input dialog for a host-controlled action form; it closes only on success. */
export function AppActionDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  confirmation,
  disabledReason,
  children,
  onSubmit
}: AppActionDialogProps) {
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    let outcome: AppActionOutcome;
    try {
      outcome = normalizeOutcome(await onSubmit());
    } catch (submitError) {
      outcome = {
        ok: false,
        error: submitError instanceof Error ? submitError.message : 'The action could not be completed.'
      };
    }
    pendingRef.current = false;
    setPending(false);
    if (outcome.ok) onOpenChange(false);
    else setError(outcome.error);
  };

  if (confirmation) {
    return (
      <AlertDialog open={open} onOpenChange={(next) => {
        if (!pending) {
          setError(null);
          onOpenChange(next);
        }
      }}>
        <AlertDialogContent>
          <form onSubmit={submit}>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-4 py-4">
              {children}
              {disabledReason ? (
                <p className="text-muted-foreground text-pretty text-xs">{disabledReason}</p>
              ) : null}
              {error ? <InlineActionError message={error} /> : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <Button
                disabled={pending || Boolean(disabledReason)}
                type="submit"
                variant={confirmation.destructive ? 'destructive' : 'default'}
              >
                {pending ? <LoaderCircleIcon className="motion-safe:animate-spin" data-icon="inline-start" /> : null}
                {confirmation.confirmLabel ?? submitLabel}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!pending) {
        setError(null);
        onOpenChange(next);
      }
    }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              {children}
              {disabledReason ? (
                <p className="text-muted-foreground text-pretty text-xs">{disabledReason}</p>
              ) : null}
              {error ? <InlineActionError message={error} /> : null}
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending || Boolean(disabledReason)} type="submit">
              {pending ? <LoaderCircleIcon className="motion-safe:animate-spin" data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface AppBulkActionBarProps {
  selectedCount: number;
  actions: readonly AppActionItem[];
  onClearSelection: () => void;
}

export function AppBulkActionBar({
  selectedCount,
  actions,
  onClearSelection
}: AppBulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <aside
      aria-label="Bulk actions"
      className="bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-sm"
    >
      <p className="text-sm tabular-nums">{selectedCount} selected</p>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <AppActionButton action={action} key={action.id} size="sm" variant="outline" />
        ))}
        <Button aria-label="Clear selection" onClick={onClearSelection} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
    </aside>
  );
}
