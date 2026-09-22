import { Button } from '@constructive-io/ui/button';
import { Field } from '@constructive-io/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@constructive-io/ui/input-group';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@constructive-io/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Separator } from '@constructive-io/ui/separator';

import { SinkCard } from './sink-card';

const PROJECTS = {
  'acme-prod': 'acme-prod',
  'acme-staging': 'acme-staging',
  'acme-dev': 'acme-dev',
};

export function TransferCreditsCard() {
  return (
    <SinkCard
      title="Transfer credits"
      contentClassName="flex flex-col gap-3"
      footer={
        <Button size="sm" className="w-full">
          Review transfer
        </Button>
      }
    >
      <Field label="From project">
        <Select defaultValue="acme-prod" items={PROJECTS}>
          <SelectTrigger aria-label="From project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(PROJECTS).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="To project">
        <Select defaultValue="acme-staging" items={PROJECTS}>
          <SelectTrigger aria-label="To project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(PROJECTS).map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Amount">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>⌁</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput defaultValue="250" inputMode="numeric" aria-label="Amount in credits" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>credits</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <ItemGroup className="gap-1">
        <Item variant="muted" size="xs">
          <ItemContent>
            <ItemTitle className="text-muted-foreground">Fee</ItemTitle>
          </ItemContent>
          <ItemDescription className="tabular-nums">0</ItemDescription>
        </Item>
        <Item variant="muted" size="xs">
          <ItemContent>
            <ItemTitle className="text-muted-foreground">Arrives</ItemTitle>
          </ItemContent>
          <ItemDescription className="tabular-nums">Instantly</ItemDescription>
        </Item>
      </ItemGroup>
      <Separator />
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">Total</span>
        <span className="text-sm font-medium tabular-nums">250 credits</span>
      </div>
    </SinkCard>
  );
}
