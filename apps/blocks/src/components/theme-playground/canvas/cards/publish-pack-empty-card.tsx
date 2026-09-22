import { Package } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@constructive-io/ui/empty';

import { SinkCard } from './sink-card';

export function PublishPackEmptyCard() {
  return (
    <SinkCard>
      <Empty className="rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Publish your first feature pack</EmptyTitle>
          <EmptyDescription>Bundle schemas, policies and UI into a reusable pack.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button size="sm">Create pack</Button>
            <Button variant="outline" size="sm">
              Read the guide
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
