import { Badge } from '@constructive-io/ui/badge';
import { Item, ItemContent, ItemTitle } from '@constructive-io/ui/item';
import { Separator } from '@constructive-io/ui/separator';

import { SinkCard } from './sink-card';

function CreditRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-2 text-[13px]">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

export function CreditsBalanceCard() {
  return (
    <SinkCard
      footer={
        <p className="text-[12px] text-muted-foreground">Credits apply automatically before card charges on the 1st.</p>
      }
    >
      <div className="flex items-center gap-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">$240.00</p>
        <Badge variant="secondary">Credits</Badge>
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">Available credits</p>
      <Item variant="muted" size="sm" className="mt-4">
        <ItemContent>
          <ItemTitle className="sr-only">Credit breakdown</ItemTitle>
          <div className="w-full">
            <CreditRow label="Promotional credits" value="$200.00" />
            <CreditRow label="Referral credits" value="$40.00" />
            <Separator />
            <CreditRow label="Total available" value="$240.00" strong />
          </div>
        </ItemContent>
      </Item>
    </SinkCard>
  );
}
