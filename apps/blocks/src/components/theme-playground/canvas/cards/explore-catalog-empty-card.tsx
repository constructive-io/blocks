import { Compass } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@constructive-io/ui/empty';

import { SinkCard } from './sink-card';

export function ExploreCatalogEmptyCard() {
  return (
    <SinkCard contentClassName="px-0 pt-0 pb-0">
      <Empty className="rounded-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Compass aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Explore the block catalog</EmptyTitle>
          <EmptyDescription>
            Install ready-made blocks — org charts, billing, storage — from the registry.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            Browse blocks
          </Button>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
