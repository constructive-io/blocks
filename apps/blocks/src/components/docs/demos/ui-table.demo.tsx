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

function MembersTable() {
  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Table>
        <TableCaption className="border-t border-border/60 px-4 py-3 text-center">
          Members of Acme Corp.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Member</TableHead>
            <TableHead scope="col">Role</TableHead>
            <TableHead scope="col" className="text-right">
              Status
            </TableHead>
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
      </Table>
    </div>
  );
}

export function BasicTableDemo() {
  return (
    <Demo>
      <MembersTable />
    </Demo>
  );
}

export function WideTableDemo() {
  return (
    <Demo>
      <Table
        className="min-w-[44rem]"
        containerClassName="w-full max-w-lg rounded-lg border bg-background"
      >
        <TableCaption>Recent production deployments.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Version</TableHead>
            <TableHead scope="col">Environment</TableHead>
            <TableHead scope="col">Commit</TableHead>
            <TableHead scope="col">Author</TableHead>
            <TableHead scope="col" className="text-right">
              Duration
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">v1.24.0</TableCell>
            <TableCell>Production</TableCell>
            <TableCell className="font-mono text-xs">9ea20f7</TableCell>
            <TableCell>Ada Carter</TableCell>
            <TableCell className="text-right tabular-nums">2m 14s</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">v1.23.1</TableCell>
            <TableCell>Production</TableCell>
            <TableCell className="font-mono text-xs">4c8b156</TableCell>
            <TableCell>Ravi Singh</TableCell>
            <TableCell className="text-right tabular-nums">1m 48s</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicTableDemo />;
}
