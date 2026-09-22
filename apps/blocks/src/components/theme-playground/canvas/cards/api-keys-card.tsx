import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@constructive-io/ui/table';

import { SinkCard } from './sink-card';

const KEYS = [
  { name: 'service_role', lastUsed: '2m', active: true },
  { name: 'anon_read', lastUsed: '14m', active: true },
  { name: 'ci_deploy', lastUsed: '3d', active: false },
];

export function ApiKeysCard() {
  return (
    <SinkCard title="API keys" contentClassName="px-0 py-0">
      <Table className="text-[13px] [&_td]:px-2 [&_td]:py-3 [&_th]:px-2 [&_th]:py-3">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10 pr-2">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {KEYS.map((key) => (
            <TableRow key={key.name}>
              <TableCell className="max-w-[8rem] truncate pl-4 font-mono text-[12px]">{key.name}</TableCell>
              <TableCell className="text-muted-foreground">{key.lastUsed}</TableCell>
              <TableCell>
                <Badge variant={key.active ? 'success' : 'secondary'}>{key.active ? 'Active' : 'Revoked'}</Badge>
              </TableCell>
              <TableCell className="pr-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${key.name}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Copy key</DropdownMenuItem>
                    <DropdownMenuItem>Rotate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Revoke</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SinkCard>
  );
}
