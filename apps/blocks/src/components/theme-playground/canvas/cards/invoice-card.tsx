import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@constructive-io/ui/table';

import { SinkCard } from './sink-card';

const LINES = [
  { item: 'Compute (Burst)', qty: '1', amount: '$640.00' },
  { item: 'Storage', qty: '30 GB', amount: '$6.00' },
  { item: 'Egress', qty: '1.84 TB', amount: '$166.00' },
  { item: 'Read replica', qty: '×2', amount: '$96.00' },
];

const TOTALS = [
  { label: 'Subtotal', value: '$908.00' },
  { label: 'Tax (19%)', value: '$171.52' },
  { label: 'Total', value: '$1,079.52' },
];

export function InvoiceCard() {
  return (
    <SinkCard
      title="Invoice #INV-2847"
      description="Due Jun 30, 2026"
      action={<Badge variant="warning">Open</Badge>}
      contentClassName="px-0 pt-0"
      footer={
        <>
          <Button variant="outline" size="sm">
            Download PDF
          </Button>
          <Button size="sm" className="ml-auto">
            Pay now
          </Button>
        </>
      }
    >
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 pl-4">Item</TableHead>
            <TableHead className="h-9">Qty</TableHead>
            <TableHead className="h-9 pr-4 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {LINES.map((line) => (
            <TableRow key={line.item} className="border-border/60">
              <TableCell className="pl-4">{line.item}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{line.qty}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{line.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-col gap-1.5 px-4 pt-3 text-[13px]">
        {TOTALS.map((row, index) => (
          <div key={row.label} className="flex items-baseline justify-between">
            <span className={index === 2 ? 'font-medium' : 'text-muted-foreground'}>{row.label}</span>
            <span className={`tabular-nums ${index === 2 ? 'text-sm font-semibold' : 'text-muted-foreground'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </SinkCard>
  );
}
