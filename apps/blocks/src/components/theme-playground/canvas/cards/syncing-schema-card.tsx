import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@constructive-io/ui/empty';
import { Spinner } from '@constructive-io/ui/spinner';

import { SinkCard } from './sink-card';

export function SyncingSchemaCard() {
  return (
    <SinkCard>
      <Empty className="rounded-md">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner className="size-5 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>Syncing schema…</EmptyTitle>
          <EmptyDescription>
            Applying 3 migrations to <span className="font-mono text-[12px]">eu-central-1</span>.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            View log
          </Button>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
