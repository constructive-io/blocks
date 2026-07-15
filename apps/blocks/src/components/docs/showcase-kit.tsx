'use client';

/**
 * showcase-kit — shared controls for live block demos.
 *
 * Co-located demo files (`./demos/<slug>.demo.tsx`) import these so every demo
 * shares one outcome toggle + centering wrapper. The demos are aggregated into
 * the `DEMOS` map in `showcase.tsx` and mounted inside `<PreviewFrame>` (which
 * supplies the QueryClient + docs mock adapter).
 *
 * Docs harness only — never imported by block source.
 */

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Mutation demos toggle between the resolved and the error path. */
export type Outcome = 'success' | 'error';

/** A two-state segmented control sitting above a mutation preview. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5 inline-flex items-center gap-1 rounded-lg border border-border/60 p-1 text-[13px]">
      <span className="px-2 font-medium text-muted-foreground">{label}</span>
      {options.map((o) => {
        const selected = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o)}
            className={cn(
              'h-7 rounded-lg px-3 text-[13px] capitalize outline-none',
              'transition-[color,background-color] duration-[var(--dur-fast)] focus-visible:ring-1 focus-visible:ring-ring',
              selected ? 'bg-active text-foreground' : 'text-muted-foreground hover:bg-hover hover:text-foreground',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Centers a demo's controls + block within the stage. */
export function Demo({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center">{children}</div>;
}
