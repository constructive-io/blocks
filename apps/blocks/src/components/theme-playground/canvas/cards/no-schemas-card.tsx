import { Database } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@constructive-io/ui/empty';

import { SinkCard } from './sink-card';

export function NoSchemasCard() {
  return (
    <SinkCard title="Schemas">
      <Empty className="rounded-md py-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Database aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No schemas yet</EmptyTitle>
          <EmptyDescription>Schemas group your tables, policies and generated API surface.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            Create schema
          </Button>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
