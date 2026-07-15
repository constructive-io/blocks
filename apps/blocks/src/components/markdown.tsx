import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

// Renders a spec doc as prose. No interactivity, so it stays a Server Component
// and is baked into static HTML at build time. Typography comes from
// @tailwindcss/typography (loaded directly in globals.css); every --tw-prose-*
// variable is pinned to a semantic design token by the `.prose` bridge there,
// and those tokens already flip under `.dark` — so prose stays legible in both
// themes with no `dark:prose-invert` needed.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none',
        'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-pre:rounded-lg prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted',
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none',
        'prose-a:text-primary prose-a:font-medium',
        'prose-table:text-sm',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
