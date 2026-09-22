import { CreditCard } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@constructive-io/ui/empty';

import { SinkCard } from './sink-card';

export function ConnectPaymentEmptyCard() {
  return (
    <SinkCard contentClassName="px-0 pt-0 pb-0">
      <Empty className="rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCard aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Connect a payment method</EmptyTitle>
          <EmptyDescription>Add a card to move past the free tier.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex flex-col items-center gap-1">
          <Button size="sm">Add card</Button>
          <Button variant="link" size="sm" className="text-muted-foreground">
            Learn about billing
          </Button>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
