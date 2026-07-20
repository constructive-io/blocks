'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, CircleAlert, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { toolRegistry, type ToolEntry } from './tool-registry';
import { ToolStatus } from './tool-status';
import { getToolUI } from './tool-ui-config';

// ── Lifecycle ───────────────────────────────────────────────────────────────

function useToolLifecycle(state: string, output?: string, stopped?: boolean) {
  const parsedOutput = useMemo(() => {
    try {
      return output ? JSON.parse(output) : null;
    } catch {
      return null;
    }
  }, [output]);

  const isStreaming = state === 'input-streaming' || state === 'input-available';

  return {
    isStreaming,
    isStopped: !!stopped && isStreaming,
    hasInput: !isStreaming,
    isApprovalPending: state === 'approval-requested',
    isRejected: state === 'output-denied' || parsedOutput?.rejected === true,
    isDone: state === 'output-available' && !parsedOutput?.rejected,
    isOutputError: state === 'output-error',
    parsedOutput,
  };
}

// ── ToolMessage ─────────────────────────────────────────────────────────────

interface ToolMessageProps {
  toolName: string;
  toolCallId: string;
  state: string;
  input: any;
  output?: string;
  approval?: { id: string; approved?: boolean };
  stopped?: boolean;
  onApprove: (id: string) => void;
  onToolOutput: (toolCallId: string, output: string) => void;
}

export function ToolMessage({
  toolName,
  toolCallId,
  state,
  input,
  output,
  approval,
  stopped,
  onApprove,
  onToolOutput,
}: ToolMessageProps) {
  const entry: ToolEntry<any> | undefined = toolRegistry[toolName];
  const ui = getToolUI(toolName);
  const lifecycle = useToolLifecycle(state, output, stopped);
  const [isExecuting, setIsExecuting] = useState(false);
  const executedRef = useRef(false);

  const handleReject = useCallback(
    () => onToolOutput(toolCallId, JSON.stringify({ rejected: true })),
    [toolCallId, onToolOutput],
  );

  // Execute on approval (client tools only)
  useEffect(() => {
    if (state !== 'approval-responded' || !approval?.approved || isExecuting || executedRef.current || !entry) return;
    executedRef.current = true;
    setIsExecuting(true);

    entry
      .execute(input)
      .then((result) => onToolOutput(toolCallId, result))
      .catch((err) =>
        onToolOutput(
          toolCallId,
          JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Failed' }),
        ),
      )
      .finally(() => setIsExecuting(false));
  }, [state, approval?.approved, isExecuting, entry, input, toolCallId, onToolOutput]);

  if (!input && !lifecycle.isStreaming) return null;

  return (
    <>
      {lifecycle.isStopped && <ToolStatus variant='error'>Stopped</ToolStatus>}
      {lifecycle.isStreaming && !lifecycle.isStopped && (
        <ToolStatus variant='loading'>{ui.labels.streaming}</ToolStatus>
      )}

      {lifecycle.isApprovalPending && approval?.id && (
        <ToolApprovalCard
          ui={ui}
          onApprove={() => onApprove(approval.id)}
          onReject={handleReject}
        >
          {ui.renderPreview ? ui.renderPreview(input) : <DefaultPreview input={input} />}
        </ToolApprovalCard>
      )}

      {lifecycle.isRejected && <ToolStatus variant='error'>Rejected</ToolStatus>}
      {isExecuting && <ToolStatus variant='loading'>{ui.labels.executing}</ToolStatus>}
      {lifecycle.isDone && <ToolResult output={output} doneLabel={ui.labels.done} errorLabel={ui.labels.error} />}
      {lifecycle.isOutputError && <ToolStatus variant='error'>{ui.labels.error}</ToolStatus>}
    </>
  );
}

// ── Default preview (key-value fallback) ────────────────────────────────────

export function DefaultPreview({ input }: { input: any }) {
  const entries = Object.entries(input ?? {}).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;
  return (
    <div className='text-muted-foreground mt-2 space-y-0.5 text-[11px]'>
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className='text-muted-foreground/80'>{key}:</span>{' '}
          <span className='text-foreground font-mono'>
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Approval card ───────────────────────────────────────────────────────────

const BADGE_STYLES = {
  create: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  update: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

function ToolApprovalCard({
  ui,
  children,
  onApprove,
  onReject,
}: {
  ui: ReturnType<typeof getToolUI>;
  children: React.ReactNode;
  onApprove: () => void;
  onReject: () => void;
}) {
  const badge = ui.approval?.badge;

  return (
    <div className='bg-background my-2 overflow-hidden rounded-md border'>
      <div className='px-3 py-2.5'>
        {badge && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
              BADGE_STYLES[badge.variant],
            )}
          >
            <badge.icon className='size-2.5' />
            {badge.label}
          </span>
        )}
        {children}
      </div>
      <div className='flex items-center border-t px-3 py-2'>
        <button
          type='button'
          onClick={onApprove}
          className={cn(
            'mr-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2.5 py-1 text-xs font-medium sm:min-h-10',
            'bg-primary text-primary-foreground',
            'transition-[opacity,scale] duration-150 ease-out hover:opacity-90 motion-safe:active:scale-[0.96] motion-reduce:transition-none',
          )}
        >
          <Check className='size-3' />
          Approve
        </button>
        <button
          type='button'
          onClick={onReject}
          className={cn(
            'inline-flex min-h-11 items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-medium sm:min-h-10',
            'text-muted-foreground hover:text-foreground',
            'transition-[color,scale] duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none',
          )}
        >
          <X className='size-3' />
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Tool result ─────────────────────────────────────────────────────────────

function ToolResult({ output, doneLabel, errorLabel }: { output?: string; doneLabel: string; errorLabel: string }) {
  const parsed = useMemo(() => {
    try {
      return output ? JSON.parse(output) : null;
    } catch {
      return null;
    }
  }, [output]);

  const isError = parsed?.success === false || (parsed && 'error' in parsed && !parsed?.rejected);

  if (isError) return <ExpandableError label={errorLabel} error={parsed?.error} />;
  return <ToolStatus variant='done'>{doneLabel}</ToolStatus>;
}

// ── Expandable error ────────────────────────────────────────────────────────

function ExpandableError({ label, error }: { label: string; error?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className='my-1.5'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='text-destructive flex min-h-11 items-center gap-2 rounded-md py-0.5 text-xs transition-transform duration-150 ease-out motion-safe:active:scale-[0.96] motion-reduce:transition-none sm:min-h-10'
      >
        <CircleAlert className='size-3 shrink-0' />
        <span>{label}</span>
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className='mt-1 pl-5'>
          <div className='text-destructive text-[11px]'>{error ?? 'Unknown error'}</div>
        </div>
      )}
    </div>
  );
}
