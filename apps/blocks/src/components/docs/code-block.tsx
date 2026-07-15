/**
 * CodeBlock — the standalone, server-highlighted code snippet primitive.
 *
 * The thin building block for hand-authored guide pages (tutorial / how-to /
 * concept): pass a raw `code` string and it highlights it on the SERVER with
 * Shiki (`@/lib/highlight`, dual `github-light`/`github-dark` via per-token CSS
 * variables), then hands the HTML to the shared <CodeSurface> for the calm frame,
 * header, and copy control. No client Shiki ships and there's no highlight flash;
 * the active palette is picked by the `.dark` scope at render time, so it tracks
 * the theme for free (static-export friendly).
 *
 * It is the snippet-only sibling of <ComponentPreview>'s Code tab: both render the
 * same <CodeSurface>, but ComponentPreview is a client component so its page
 * highlights upstream and passes the HTML down, whereas CodeBlock owns its own
 * `await highlight(...)` so a guide author can drop
 * `<CodeBlock code={…} filename="app/page.tsx" />` straight into a server page
 * with no plumbing.
 *
 * Async Server Component (no `'use client'`) — `await`-rendered by its parent.
 * Docs harness only — never imported by block source.
 */

import { CodeSurface } from '@/components/docs/code-surface';
import { highlight } from '@/lib/highlight';

export interface CodeBlockProps {
  /** Raw source — highlighted for display and used verbatim by the copy control. */
  code: string;
  /** Shiki language (`tsx` | `ts` | `bash` | `json` | `css`). Unknown → `tsx`. */
  lang?: string;
  /** Optional filename shown in the header (implies the language). */
  filename?: string;
  className?: string;
}

export async function CodeBlock({ code, lang = 'tsx', filename, className }: CodeBlockProps) {
  const codeHtml = await highlight(code, lang);
  return <CodeSurface codeHtml={codeHtml} copyValue={code} label={filename ?? lang} className={className} />;
}

export default CodeBlock;
