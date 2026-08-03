'use client';

import * as React from 'react';
import { LoaderCircleIcon, MoreHorizontalIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import type { AppActionDefinition, AppResult } from '../core/contracts';
import { useAppAction } from '../core/runtime';
import {
  AppActionButton,
  AppActionConfirmationDialog,
  AppActionDialog,
  type AppActionConfirmation,
  type AppActionItem,
  type AppActionOutcome
} from './actions';

export interface ConnectedAppAction<
  TInput,
  TOutput,
  TOptimistic = unknown
> {
  definition: AppActionDefinition<TInput, TOutput, TOptimistic>;
  input: TInput;
  label?: string;
}

function confirmationOf<TInput, TOutput, TOptimistic>(
  definition: AppActionDefinition<TInput, TOutput, TOptimistic>
): AppActionConfirmation | undefined {
  return definition.presentation?.confirmation;
}

function outcomeOf<TOutput>(result: AppResult<TOutput>): AppActionOutcome {
  return result.ok ? { ok: true } : { ok: false, error: result.error.message };
}

function useConnectedActionItem<TInput, TOutput, TOptimistic>({
  definition,
  input,
  label
}: ConnectedAppAction<TInput, TOutput, TOptimistic>) {
  const runtime = useAppAction(definition, { presentationInput: input });
  const item: AppActionItem = {
    id: definition.id,
    label: label ?? definition.presentation?.label ?? definition.id,
    description: definition.presentation?.description,
    disabledReason: runtime.disabledReason,
    confirmation: definition.presentation?.confirmation,
    execute: async () => outcomeOf(await runtime.execute(input))
  };
  return { item, runtime };
}

export interface ConnectedAppActionButtonProps<
  TInput,
  TOutput,
  TOptimistic = unknown
> extends ConnectedAppAction<TInput, TOutput, TOptimistic> {
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
}

export function ConnectedAppActionButton<
  TInput,
  TOutput,
  TOptimistic = unknown
>(props: ConnectedAppActionButtonProps<TInput, TOutput, TOptimistic>) {
  const { item, runtime } = useConnectedActionItem(props);
  if (!runtime.visible) return null;
  return <AppActionButton action={item} size={props.size} variant={props.variant} />;
}

interface ResolvedConnectedMenuAction {
  item: AppActionItem;
  pending: boolean;
}

interface ConnectedActionsResolverProps<TInput, TOutput, TOptimistic> {
  actions: readonly ConnectedAppAction<TInput, TOutput, TOptimistic>[];
  children: (actions: readonly ResolvedConnectedMenuAction[]) => React.ReactNode;
  index?: number;
  resolved?: readonly ResolvedConnectedMenuAction[];
}

function ConnectedActionResolver<TInput, TOutput, TOptimistic>({
  action,
  actions,
  children,
  index,
  resolved
}: ConnectedActionsResolverProps<TInput, TOutput, TOptimistic> & {
  action: ConnectedAppAction<TInput, TOutput, TOptimistic>;
  index: number;
  resolved: readonly ResolvedConnectedMenuAction[];
}) {
  const { item, runtime } = useConnectedActionItem(action);
  const next = runtime.visible
    ? [...resolved, { item, pending: runtime.mutation.isPending }]
    : resolved;
  return (
    <ConnectedActionsResolver
      actions={actions}
      index={index + 1}
      resolved={next}
    >
      {children}
    </ConnectedActionsResolver>
  );
}

function ConnectedActionsResolver<TInput, TOutput, TOptimistic>({
  actions,
  children,
  index = 0,
  resolved = []
}: ConnectedActionsResolverProps<TInput, TOutput, TOptimistic>) {
  const action = actions[index];
  if (!action) return children(resolved);
  return (
    <ConnectedActionResolver
      action={action}
      actions={actions}
      index={index}
      resolved={resolved}
    >
      {children}
    </ConnectedActionResolver>
  );
}

function ConnectedActionMenuSurface({
  actions,
  label,
  onActionComplete
}: {
  actions: readonly ResolvedConnectedMenuAction[];
  label: string;
  onActionComplete?: (actionId: string) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
  const selected = actions.find((action) => action.item.id === selectedActionId);

  const run = async (action: ResolvedConnectedMenuAction) => {
    if (action.item.confirmation) {
      setSelectedActionId(action.item.id);
      return;
    }
    setError(null);
    const outcome = await action.item.execute();
    if (outcome && !outcome.ok) setError(outcome.error);
    else onActionComplete?.(action.item.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={label} size="icon-sm" variant="outline">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {actions.map((action) => (
              <DropdownMenuItem
                disabled={Boolean(action.item.disabledReason) || action.pending}
                key={action.item.id}
                onClick={() => void run(action)}
                variant={action.item.confirmation?.destructive ? 'destructive' : 'default'}
              >
                {action.pending ? <LoaderCircleIcon className="motion-safe:animate-spin" /> : null}
                {action.item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {selected ? (
        <AppActionConfirmationDialog
          action={selected.item}
          onComplete={() => onActionComplete?.(selected.item.id)}
          onOpenChange={(open) => {
            if (!open) setSelectedActionId(null);
          }}
          open
        />
      ) : null}
    </div>
  );
}

export interface ConnectedAppActionMenuProps<
  TInput,
  TOutput,
  TOptimistic = unknown
> {
  actions: readonly ConnectedAppAction<TInput, TOutput, TOptimistic>[];
  label?: string;
  onActionComplete?: (actionId: string) => void;
}

export function ConnectedAppActionMenu<
  TInput,
  TOutput,
  TOptimistic = unknown
>({
  actions,
  label = 'More actions',
  onActionComplete
}: ConnectedAppActionMenuProps<TInput, TOutput, TOptimistic>) {
  return (
    <ConnectedActionsResolver actions={actions}>
      {(resolved) => (
        <ConnectedActionMenuSurface
          actions={resolved}
          label={label}
          onActionComplete={onActionComplete}
        />
      )}
    </ConnectedActionsResolver>
  );
}

export interface ConnectedAppActionDialogProps<
  TInput,
  TOutput,
  TOptimistic = unknown
> extends ConnectedAppAction<TInput, TOutput, TOptimistic> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function ConnectedAppActionDialog<
  TInput,
  TOutput,
  TOptimistic = unknown
>({
  definition,
  input,
  label,
  open,
  onOpenChange,
  children,
  title,
  description,
  submitLabel
}: ConnectedAppActionDialogProps<TInput, TOutput, TOptimistic>) {
  const runtime = useAppAction(definition, { presentationInput: input });
  if (!runtime.visible) return null;
  const presentation = definition.presentation;
  return (
    <AppActionDialog
      confirmation={confirmationOf(definition)}
      description={description ?? presentation?.description ?? 'Complete the fields to run this action.'}
      disabledReason={runtime.disabledReason}
      onOpenChange={onOpenChange}
      onSubmit={async () => outcomeOf(await runtime.execute(input))}
      open={open}
      submitLabel={submitLabel ?? presentation?.confirmation?.confirmLabel ?? label ?? presentation?.label ?? definition.id}
      title={title ?? presentation?.label ?? definition.id}
    >
      {children}
    </AppActionDialog>
  );
}

export interface ConnectedAppBulkActionBarProps<
  TSelection,
  TInput,
  TOutput,
  TOptimistic = unknown
> {
  selection: readonly TSelection[];
  actions: readonly Readonly<{
    definition: AppActionDefinition<TInput, TOutput, TOptimistic>;
    input: (selection: readonly TSelection[]) => TInput;
    label?: string;
  }>[];
  onClearSelection: () => void;
}

export function ConnectedAppBulkActionBar<
  TSelection,
  TInput,
  TOutput,
  TOptimistic = unknown
>({
  selection,
  actions,
  onClearSelection
}: ConnectedAppBulkActionBarProps<TSelection, TInput, TOutput, TOptimistic>) {
  if (selection.length === 0) return null;
  return (
    <aside
      aria-label="Bulk actions"
      className="bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-sm"
    >
      <p className="text-sm tabular-nums">{selection.length} selected</p>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <ConnectedAppActionButton
            definition={action.definition}
            input={action.input(selection)}
            key={action.definition.id}
            label={action.label}
            size="sm"
            variant="outline"
          />
        ))}
        <Button aria-label="Clear selection" onClick={onClearSelection} size="icon-sm" variant="ghost">
          <XIcon />
        </Button>
      </div>
    </aside>
  );
}
