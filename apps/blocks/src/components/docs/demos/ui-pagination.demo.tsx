'use client';

import { useState, type MouseEvent } from 'react';

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

export function BasicPaginationDemo() {
  return (
    <Demo>
      <Pagination aria-label="Database pages">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="?page=1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="?page=3">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="?page=3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Demo>
  );
}

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

export function InteractivePaginationDemo() {
  const [page, setPage] = useState(4);

  const go = (next: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPage(Math.min(Math.max(next, 1), TOTAL));
  };

  const items = pageItems(page, TOTAL);

  return (
    <Demo>
      <div className="flex w-full max-w-lg flex-col items-center gap-3">
        <Pagination aria-label="Query result pages">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`?page=${Math.max(page - 1, 1)}`}
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
                    href={`?page=${item}`}
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
                href={`?page=${Math.min(page + 1, TOTAL)}`}
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

export function SimplePaginationDemo() {
  return (
    <Demo>
      <Pagination aria-label="Audit log pages">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="?page=1" isDisabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="?page=2" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Demo>
  );
}

export function BlockDemo() {
  return <InteractivePaginationDemo />;
}
