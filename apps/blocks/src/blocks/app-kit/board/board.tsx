'use client';

import * as React from 'react';
import { ArrowRightIcon, GripVerticalIcon, MoreHorizontalIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';

export interface AppBoardColumn<TColumnId extends string> {
  id: TColumnId;
  title: string;
  description?: string;
}

export interface AppBoardMove<TRecord, TColumnId extends string> {
  record: TRecord;
  recordId: string;
  fromColumnId: TColumnId;
  toColumnId: TColumnId;
}

export interface AppBoardProps<TRecord, TColumnId extends string> {
  columns: readonly AppBoardColumn<TColumnId>[];
  records: readonly TRecord[];
  getRecordId: (record: TRecord) => string;
  getRecordLabel: (record: TRecord) => string;
  getColumnId: (record: TRecord) => TColumnId;
  renderCard?: (record: TRecord) => React.ReactNode;
  onOpenRecord?: (record: TRecord) => void;
  onMove?: (move: AppBoardMove<TRecord, TColumnId>) => void | Promise<void>;
  canMove?: (move: AppBoardMove<TRecord, TColumnId>) => boolean;
  density?: 'compact' | 'comfortable';
  surface?: 'page' | 'card' | 'embedded';
  className?: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The record could not be moved.';
}

/**
 * A controlled, resource-agnostic board. Moving is unavailable unless the
 * host supplies a semantic `onMove` action; native drag and the keyboard menu
 * both call the same action contract.
 */
export function AppBoard<TRecord, TColumnId extends string>({
  columns,
  records,
  getRecordId,
  getRecordLabel,
  getColumnId,
  renderCard,
  onOpenRecord,
  onMove,
  canMove,
  density = 'comfortable',
  surface = 'page',
  className
}: AppBoardProps<TRecord, TColumnId>) {
  const boardId = React.useId();
  const [draggedRecordId, setDraggedRecordId] = React.useState<string | null>(null);
  const [pendingRecordIds, setPendingRecordIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [moveError, setMoveError] = React.useState<string | null>(null);

  const recordsById = React.useMemo(
    () => new Map(records.map((record) => [getRecordId(record), record])),
    [getRecordId, records]
  );

  const moveRecord = React.useCallback(async (
    record: TRecord,
    toColumnId: TColumnId
  ) => {
    if (!onMove) return;

    const recordId = getRecordId(record);
    const fromColumnId = getColumnId(record);
    const move = { record, recordId, fromColumnId, toColumnId };
    if (fromColumnId === toColumnId || canMove?.(move) === false) return;

    setMoveError(null);
    setPendingRecordIds((current) => new Set(current).add(recordId));
    try {
      await onMove(move);
    } catch (error) {
      // The connected action owns optimistic cache rollback. This local error
      // stays next to the board so a rejected drop is never silent.
      setMoveError(errorMessage(error));
    } finally {
      setPendingRecordIds((current) => {
        const next = new Set(current);
        next.delete(recordId);
        return next;
      });
    }
  }, [canMove, getColumnId, getRecordId, onMove]);

  return (
    <section
      aria-label="Board"
      className={className}
      data-density={density}
      data-surface={surface}
    >
      {moveError ? (
        <Alert className="mb-4" variant="destructive">
          <AlertTitle>Move failed</AlertTitle>
          <AlertDescription>{moveError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid auto-cols-[minmax(17rem,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const headingId = `${boardId}-column-${column.id}`;
          const columnRecords = records.filter(
            (record) => getColumnId(record) === column.id
          );

          return (
            <section
              aria-labelledby={headingId}
              className="bg-muted/30 flex min-h-52 flex-col gap-3 rounded-xl border p-3"
              key={column.id}
              onDragOver={onMove ? (event) => event.preventDefault() : undefined}
              onDrop={onMove ? (event) => {
                event.preventDefault();
                const recordId = event.dataTransfer.getData('text/plain') || draggedRecordId;
                const record = recordId ? recordsById.get(recordId) : undefined;
                setDraggedRecordId(null);
                if (record) void moveRecord(record, column.id);
              } : undefined}
            >
              <header className="flex items-start justify-between gap-3 px-1">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2
                    className="truncate text-sm font-semibold"
                    id={headingId}
                  >
                    {column.title}
                  </h2>
                  {column.description ? (
                    <p className="text-muted-foreground text-pretty text-xs">
                      {column.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-muted-foreground tabular-nums text-xs">
                  {columnRecords.length}
                </span>
              </header>

              <div className="flex flex-col gap-3">
                {columnRecords.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-pretty text-sm">
                    No records in {column.title}.
                  </p>
                ) : columnRecords.map((record) => {
                  const recordId = getRecordId(record);
                  const label = getRecordLabel(record);
                  const pending = pendingRecordIds.has(recordId);
                  const movableColumns = columns.filter((candidate) => {
                    const move = {
                      record,
                      recordId,
                      fromColumnId: column.id,
                      toColumnId: candidate.id
                    };
                    return candidate.id !== column.id && canMove?.(move) !== false;
                  });

                  return (
                    <Card
                      aria-busy={pending || undefined}
                      data-record-id={recordId}
                      draggable={Boolean(onMove) && !pending}
                      key={recordId}
                      onDragEnd={() => setDraggedRecordId(null)}
                      onDragStart={onMove ? (event) => {
                        setDraggedRecordId(recordId);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', recordId);
                      } : undefined}
                      variant="flat"
                    >
                      <CardHeader className={density === 'compact' ? 'px-4' : undefined}>
                        <CardTitle>
                          {onOpenRecord ? (
                            <Button
                              aria-label={`Open ${label}`}
                              onClick={() => onOpenRecord(record)}
                              size="sm"
                              variant="link"
                            >
                              {label}
                            </Button>
                          ) : label}
                        </CardTitle>
                        {onMove ? (
                          <CardAction className="flex items-center gap-1">
                            <GripVerticalIcon aria-hidden="true" className="text-muted-foreground" />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-label={`Move ${label}`}
                                  disabled={pending || movableColumns.length === 0}
                                  size="icon-xs"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                                  {movableColumns.map((target) => (
                                    <DropdownMenuItem
                                      key={target.id}
                                      onClick={() => void moveRecord(record, target.id)}
                                    >
                                      <ArrowRightIcon />
                                      {target.title}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardAction>
                        ) : null}
                      </CardHeader>
                      {renderCard ? (
                        <CardContent className={density === 'compact' ? 'px-4' : undefined}>
                          {renderCard(record)}
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
