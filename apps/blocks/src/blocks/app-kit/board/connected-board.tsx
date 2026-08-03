'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Skeleton } from '@constructive-io/ui/skeleton';
import type {
  AppActionDefinition,
  AppQueryDefinition
} from '../core/contracts';
import { useAppAction, useAppQuery } from '../core/runtime';
import { AppBoard, type AppBoardMove, type AppBoardProps } from './board';

export interface AppBoardMoveAction<
  TRecord,
  TColumnId extends string,
  TInput,
  TOutput,
  TOptimistic = unknown
> {
  definition: AppActionDefinition<TInput, TOutput, TOptimistic>;
  input: (move: AppBoardMove<TRecord, TColumnId>) => TInput;
}

export interface ConnectedAppBoardProps<
  TRecord,
  TColumnId extends string,
  TQueryInput,
  TMoveInput = never,
  TMoveOutput = never,
  TOptimistic = unknown
> extends Omit<AppBoardProps<TRecord, TColumnId>, 'records' | 'onMove'> {
  query: AppQueryDefinition<TQueryInput, readonly TRecord[]>;
  queryInput: TQueryInput;
  moveAction?: AppBoardMoveAction<
    TRecord,
    TColumnId,
    TMoveInput,
    TMoveOutput,
    TOptimistic
  >;
}

function BoardLoading({ columns }: { columns: number }) {
  return (
    <div aria-label="Loading board" className="grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4" role="status">
      {Array.from({ length: Math.max(columns, 1) }, (_, index) => (
        <Skeleton className="h-64 w-full" key={index} />
      ))}
    </div>
  );
}

function MovableConnectedBoard<
  TRecord,
  TColumnId extends string,
  TMoveInput,
  TMoveOutput,
  TOptimistic
>({
  moveAction,
  ...props
}: AppBoardProps<TRecord, TColumnId> & {
  moveAction: AppBoardMoveAction<
    TRecord,
    TColumnId,
    TMoveInput,
    TMoveOutput,
    TOptimistic
  >;
}) {
  const action = useAppAction(moveAction.definition);
  const { canMove, ...boardProps } = props;

  return (
    <AppBoard
      {...boardProps}
      canMove={(move) => {
        if (canMove?.(move) === false) return false;
        const presentation = action.evaluatePresentation(
          moveAction.input(move)
        );
        return presentation.visible && !presentation.disabledReason;
      }}
      onMove={async (move) => {
        const result = await action.execute(moveAction.input(move));
        if (!result.ok) throw new Error(result.error.message);
      }}
    />
  );
}

/** Query-connected board; mutation support exists only with an explicit move action. */
export function ConnectedAppBoard<
  TRecord,
  TColumnId extends string,
  TQueryInput,
  TMoveInput = never,
  TMoveOutput = never,
  TOptimistic = unknown
>({
  query,
  queryInput,
  moveAction,
  ...props
}: ConnectedAppBoardProps<
  TRecord,
  TColumnId,
  TQueryInput,
  TMoveInput,
  TMoveOutput,
  TOptimistic
>) {
  const result = useAppQuery(query, queryInput);
  if (result.isPending) return <BoardLoading columns={props.columns.length} />;
  if (result.error) {
    const denied =
      result.error.appError.kind === 'authorization' ||
      result.error.appError.kind === 'authentication';
    return (
      <Alert variant="destructive">
        <AlertTitle>{denied ? 'Access denied' : 'Board unavailable'}</AlertTitle>
        <AlertDescription>{result.error.message}</AlertDescription>
      </Alert>
    );
  }

  const boardProps = { ...props, records: result.data ?? [] };
  if (!moveAction) return <AppBoard {...boardProps} />;
  return <MovableConnectedBoard {...boardProps} moveAction={moveAction} />;
}
