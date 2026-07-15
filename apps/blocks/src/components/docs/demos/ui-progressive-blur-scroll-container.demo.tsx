'use client';

import { ProgressiveBlurScrollContainer } from '@constructive-io/ui/progressive-blur-scroll-container';

import { Demo } from '@/components/docs/showcase-kit';

const ROWS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  name: ['users', 'posts', 'comments', 'accounts', 'sessions', 'invoices'][i % 6],
  rows: (i + 1) * 137,
}));

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex h-72 w-full max-w-sm flex-col overflow-hidden rounded-lg border bg-background">
        <div className="border-b px-4 py-3 text-sm font-medium">Tables</div>
        <ProgressiveBlurScrollContainer itemCount={ROWS.length} minItemsForBlur={6}>
          <ul className="divide-y px-4">
            {ROWS.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>{row.name}</span>
                <span className="text-muted-foreground">{row.rows.toLocaleString()} rows</span>
              </li>
            ))}
          </ul>
        </ProgressiveBlurScrollContainer>
      </div>
    </Demo>
  );
}
