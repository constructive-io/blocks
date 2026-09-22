import { Check } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@constructive-io/ui/item';

import { SinkCard } from './sink-card';

const FEATURES = [
  'Query tracing across every resolver',
  'Alerting rules with Slack and PagerDuty',
  '90-day metrics retention',
];

export function ObservabilityCard() {
  return (
    <SinkCard
      title="Observability Plus replaces Monitoring"
      action={<Badge>New</Badge>}
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <Button size="sm">Enable now</Button>
          <Button variant="ghost" size="sm" className="ml-auto">
            Compare plans
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Deeper visibility into production — tracing, alerting and long-retention metrics — without leaving the project.
      </p>
      <ItemGroup className="gap-1">
        {FEATURES.map((feature) => (
          <Item key={feature} size="xs">
            <ItemMedia>
              <Check className="size-4 text-success" aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="font-normal">{feature}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}
