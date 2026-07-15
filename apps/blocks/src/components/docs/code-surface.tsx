/**
 * CodeSurface — the single, presentational code panel shared by every code view.
 *
 * Owns the calm frame (hairline border that warms on focus-within), the thin
 * header (label + optional copy control), and the Shiki dual-theme var-mapping:
 * Shiki is emitted with `defaultColor:false`, so token colors live in per-span
 * `--shiki-light`/`--shiki-dark` variables — mapped to the active theme here (no
 * global stylesheet), with the surface fill coming from our card token.
 *
 * Presentational only — it renders pre-highlighted HTML and ships no Shiki, so it
 * carries no `'use client'`: <CodeBlock> (a server component) awaits `highlight()`
 * then renders this, and <ComponentPreview>'s Code tab (a client component, fed
 * server-highlighted HTML) renders this too. One source of truth for the frame,
 * header, and token mapping.
 *
 * Docs harness only — never imported by block source.
 */

import { CopyButton } from '@/components/copy-button';
import { cn } from '@/lib/utils';

export interface CodeSurfaceProps {
  /** Server-highlighted (Shiki, dual-theme) HTML. */
  codeHtml: string;
  /** Raw snippet for the copy control (the highlighted HTML is not copy-friendly). */
  copyValue?: string;
  /** Header label — a language (`tsx`) or a filename (`app/page.tsx`). */
  label?: string;
  className?: string;
}

export function CodeSurface({ codeHtml, copyValue, label, className }: CodeSurfaceProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-card shadow-surface-1',
        'transition-[border-color] duration-[var(--dur-fast)] focus-within:border-foreground/40 motion-reduce:transition-none',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
        <span className="truncate font-mono text-[11px] text-muted-foreground">{label}</span>
        {copyValue ? <CopyButton value={copyValue} className="-mr-1.5" /> : null}
      </div>
      <div
        className={cn(
          'overflow-x-auto p-4 text-[12.5px] leading-relaxed',
          // Shiki dual-theme → CSS vars; drop Shiki's own bg, pick the palette per theme.
          '[&_.shiki]:!bg-transparent [&_.shiki]:!m-0 [&_.shiki]:[color:var(--shiki-light)]',
          '[&_.shiki_span]:[color:var(--shiki-light)]',
          'dark:[&_.shiki]:[color:var(--shiki-dark)] dark:[&_.shiki_span]:[color:var(--shiki-dark)]',
          '[&_code]:font-mono',
        )}
        dangerouslySetInnerHTML={{ __html: codeHtml }}
      />
    </div>
  );
}

export default CodeSurface;
