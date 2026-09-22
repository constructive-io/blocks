import { Laptop, Smartphone, Tablet } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@constructive-io/ui/item';

import { SinkCard } from './sink-card';

const SESSIONS = [
  { icon: Laptop, title: 'MacBook Pro · Berlin', description: 'This device', current: true },
  { icon: Tablet, title: 'iPad Air · Lisbon', description: 'Active 2 days ago', current: false },
  { icon: Smartphone, title: 'Pixel 9 · Berlin', description: 'Active last week', current: false },
];

export function RecoveryAccessCard() {
  return (
    <SinkCard
      title="Recovery & sessions"
      contentClassName="flex flex-col gap-4"
      footer={
        <Button variant="destructive-outline" size="sm" className="w-full">
          Sign out other sessions
        </Button>
      }
    >
      <Field label="Recovery email">
        <div className="flex items-center gap-2">
          <Input defaultValue="ops@acme.dev" aria-label="Recovery email" />
          <Button variant="outline" size="sm" className="shrink-0">
            Verify
          </Button>
        </div>
      </Field>
      <ItemGroup>
        {SESSIONS.map((session) => (
          <Item key={session.title} variant="muted" size="sm">
            <ItemMedia variant="icon">
              <session.icon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="truncate">{session.title}</ItemTitle>
              <ItemDescription className="flex items-center gap-2">
                {session.description}
                {session.current ? <Badge variant="secondary">Current session</Badge> : null}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="sm" aria-label={`Revoke session on ${session.title}`}>
                Revoke
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}
