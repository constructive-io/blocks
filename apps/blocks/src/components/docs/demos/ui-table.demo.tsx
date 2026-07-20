'use client';

import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';
import { Badge } from '@constructive-io/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import { Demo } from '@/components/docs/showcase-kit';

const MEMBERS = [
  { initials: 'AC', name: 'Ada Carter', email: 'ada@acme.dev', role: 'Owner', status: 'Active' as const },
  { initials: 'JD', name: 'Jules Dupont', email: 'jules@acme.dev', role: 'Admin', status: 'Active' as const },
  { initials: 'MK', name: 'Mira Kohl', email: 'mira@acme.dev', role: 'Member', status: 'Invited' as const },
  { initials: 'RS', name: 'Ravi Singh', email: 'ravi@acme.dev', role: 'Member', status: 'Active' as const },
];

function statusBadge(status: (typeof MEMBERS)[number]['status']) {
  if (status === 'Active') return <Badge variant="success">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export function BlockDemo() {
  return (
    <Demo>
      {/*
        Frame uses overflow-hidden + radius so the scroll container and header
        band clip cleanly (concentric shell around the table surface).
      */}
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MEMBERS.map((m) => (
              <TableRow key={m.email}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{m.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-snug">{m.name}</p>
                      <p className="truncate text-xs leading-snug text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.role}</TableCell>
                <TableCell className="text-right">{statusBadge(m.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total members</TableCell>
              <TableCell className="text-right tabular-nums">{MEMBERS.length}</TableCell>
            </TableRow>
          </TableFooter>
          <TableCaption className="border-t border-border/60 px-4 py-3 text-center">
            Members of Acme Corp.
          </TableCaption>
        </Table>
      </div>
    </Demo>
  );
}
