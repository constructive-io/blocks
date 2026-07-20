'use client';

import { useState } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@constructive-io/ui/pagination';

import { Demo } from '@/components/docs/showcase-kit';

const TOTAL = 10;

/** Compact window: first, last, neighbors of current, with ellipses in gaps. */
function pageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const items: Array<number | 'ellipsis'> = [1];

  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);

  return items;
}

export function BlockDemo() {
  const [page, setPage] = useState(4);

  const go = (next: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setPage(Math.min(Math.max(next, 1), TOTAL));
  };

  const items = pageItems(page, TOTAL);

  return (
    <Demo>
      <div className="flex w-full max-w-lg flex-col items-center gap-3">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                isDisabled={page <= 1}
                onClick={go(page - 1)}
              />
            </PaginationItem>

            {items.map((item, index) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === page}
                    onClick={go(item)}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                isDisabled={page >= TOTAL}
                onClick={go(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <p className="text-center text-xs text-muted-foreground tabular-nums">
          Page {page} of {TOTAL}
        </p>
      </div>
    </Demo>
  );
}
