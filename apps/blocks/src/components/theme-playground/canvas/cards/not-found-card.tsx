import { Search } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@constructive-io/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { Kbd } from '@constructive-io/ui/kbd';

import { SinkCard } from './sink-card';

export function NotFoundCard() {
  return (
    <SinkCard contentClassName="px-0 pt-0 pb-0">
      <Empty className="rounded-md">
        <EmptyHeader>
          <p className="font-mono text-[11px] font-medium tracking-widest text-subtle-foreground">404</p>
          <EmptyTitle>Table not found</EmptyTitle>
          <EmptyDescription>It may have been renamed or dropped in a migration.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex w-full flex-col items-center gap-3">
          <InputGroup className="w-full max-w-52">
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search tables" aria-label="Search tables" />
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Go back
            </Button>
            <Button size="sm">Browse schema</Button>
          </div>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}
