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

export function BlockDemo() {
  const [page, setPage] = useState(4);

  const go = (next: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setPage(Math.min(Math.max(next, 1), TOTAL));
  };

  const pages = [1, page - 1, page, page + 1, TOTAL].filter(
    (value, index, arr) => value >= 1 && value <= TOTAL && arr.indexOf(value) === index,
  );

  return (
    <Demo>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={go(page - 1)} />
          </PaginationItem>
          {pages.map((value, index) => {
            const prev = pages[index - 1];
            const gap = prev !== undefined && value - prev > 1;
            return (
              <PaginationItem key={value}>
                {gap ? <PaginationEllipsis /> : null}
                <PaginationLink href="#" isActive={value === page} onClick={go(value)}>
                  {value}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext href="#" onClick={go(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Demo>
  );
}
