import { ChevronDown } from 'lucide-react';

import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';
import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
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

const EVENTS = [
  { actor: 'AK', name: 'A. Kim', event: 'policy.updated', target: 'orders', time: '12:04' },
  { actor: 'JM', name: 'J. Meyer', event: 'table.created', target: 'invoices', time: '11:52' },
  { actor: 'RS', name: 'R. Singh', event: 'secret.rotated', target: 'stripe', time: '11:38' },
  { actor: 'LP', name: 'L. Park', event: 'member.invited', target: 'ops team', time: '10:57' },
  { actor: 'AK', name: 'A. Kim', event: 'deploy.promoted', target: 'main', time: '10:21' },
  { actor: 'TW', name: 'T. Wolf', event: 'bucket.created', target: 'exports', time: '09:44' },
  { actor: 'JM', name: 'J. Meyer', event: 'key.revoked', target: 'ci runner', time: '09:02' },
  { actor: 'RS', name: 'R. Singh', event: 'schema.migrated', target: 'public', time: '08:30' },
];

export function AuditEventsCard() {
  return (
    <SinkCard
      title="Recent audit events"
      description="Latest changes across the project."
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Filter <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>All</DropdownMenuItem>
            <DropdownMenuItem>Schema</DropdownMenuItem>
            <DropdownMenuItem>Policy</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      contentClassName="px-0 pt-0"
      footer={
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      }
    >
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 pl-4">Actor</TableHead>
            <TableHead className="h-9">Event</TableHead>
            <TableHead className="h-9">Target</TableHead>
            <TableHead className="h-9 pr-4 text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {EVENTS.map((row, index) => (
            <TableRow key={index} className="border-border/60 hover:bg-accent/50">
              <TableCell className="pl-4">
                <span className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[9px]">{row.actor}</AvatarFallback>
                  </Avatar>
                  <span className="whitespace-nowrap">{row.name}</span>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-[12px] text-muted-foreground">
                {row.event}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{row.target}</TableCell>
              <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">{row.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SinkCard>
  );
}
