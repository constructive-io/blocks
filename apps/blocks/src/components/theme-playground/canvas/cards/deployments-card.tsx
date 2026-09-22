import { GitBranch } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@constructive-io/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@constructive-io/ui/table';

import { SinkCard } from './sink-card';

const DEPLOYS = [
  { id: 'dep_9f2c1', branch: 'main', status: 'Ready', variant: 'success', ago: '4m' },
  { id: 'dep_8a17d', branch: 'feat/billing', status: 'Building', variant: 'warning', ago: '9m' },
  { id: 'dep_77b3e', branch: 'main', status: 'Ready', variant: 'success', ago: '1h' },
  { id: 'dep_6d50a', branch: 'fix/auth-redirect', status: 'Failed', variant: 'error', ago: '3h' },
  { id: 'dep_5c02f', branch: 'main', status: 'Ready', variant: 'success', ago: '1d' },
] as const;

export function DeploymentsCard() {
  return (
    <SinkCard title="Deployments" action={<Badge variant="secondary">prod</Badge>} contentClassName="px-0 pb-2 pt-0">
      <Table className="text-[13px] [&_td]:py-3 [&_th]:py-3">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Deploy</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-4 text-right">Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEPLOYS.map((deploy) => (
            <TableRow key={deploy.id}>
              <TableCell className="pl-4 font-mono text-[12px]">{deploy.id}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="size-3.5 text-muted-foreground" aria-hidden />
                  {deploy.branch}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={deploy.variant}>{deploy.status}</Badge>
              </TableCell>
              <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">{deploy.ago}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination className="px-2 pt-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          {[1, 2, 3].map((page) => (
            <PaginationItem key={page}>
              <PaginationLink href="#" isActive={page === 1}>
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </SinkCard>
  );
}
