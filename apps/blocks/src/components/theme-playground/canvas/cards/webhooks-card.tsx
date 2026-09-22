import { Globe, MessageSquare, Siren, Trash2 } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';

import { SinkCard } from './sink-card';

const ENDPOINTS = [
  { icon: Globe, value: 'https://api.acme.dev/hooks/deploys', label: 'Deploys webhook' },
  { icon: MessageSquare, value: 'https://hooks.slack.com/services/T0123/B0456/xyz', label: 'Slack webhook' },
  { icon: Siren, value: 'https://acme.pagerduty.com/integration/alerts', label: 'PagerDuty webhook' },
];

export function WebhooksCard() {
  return (
    <SinkCard
      title="Webhooks"
      description="Endpoints that receive project events."
      contentClassName="flex flex-col gap-2"
      footer={
        <>
          <Button variant="outline" size="sm">
            Add endpoint
          </Button>
          <Button size="sm" className="ml-auto">
            Save
          </Button>
        </>
      }
    >
      {ENDPOINTS.map((endpoint) => (
        <InputGroup key={endpoint.value}>
          <InputGroupAddon>
            <endpoint.icon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput defaultValue={endpoint.value} aria-label={endpoint.label} />
          <InputGroupAddon align="inline-end">
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${endpoint.label}`}>
              <Trash2 aria-hidden />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      ))}
    </SinkCard>
  );
}
