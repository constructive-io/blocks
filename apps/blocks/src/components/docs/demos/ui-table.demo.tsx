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
  { initials: 'AC', name: 'Ada Carter', email: 'ada@acme.dev', role: 'Owner', status: 'Active' },
  { initials: 'JD', name: 'Jules Dupont', email: 'jules@acme.dev', role: 'Admin', status: 'Active' },
  { initials: 'MK', name: 'Mira Kohl', email: 'mira@acme.dev', role: 'Member', status: 'Invited' },
  { initials: 'RS', name: 'Ravi Singh', email: 'ravi@acme.dev', role: 'Member', status: 'Active' },
];

export function BlockDemo() {
  return (
    <Demo>
      <div className="w-full max-w-3xl rounded-lg border bg-background p-2">
        <Table>
          <TableCaption>Members of Acme Corp.</TableCaption>
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
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{m.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={m.status === 'Active' ? 'default' : 'secondary'}>{m.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total members</TableCell>
              <TableCell className="text-right">{MEMBERS.length}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Demo>
  );
}
