import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';
import { Label } from '@constructive-io/ui/label';

import { SinkCard } from './sink-card';

const TIERS = [
  { id: 'free', name: 'Free', price: '$0', note: 'Hobby projects' },
  { id: 'pro', name: 'Pro', price: '$24', note: 'Per seat / month' },
  { id: 'team', name: 'Team', price: '$49', note: 'Per seat / month' },
];

export function PlanTierCard() {
  return (
    <SinkCard title="Plan tier">
      <RadioGroup defaultValue="pro" className="flex flex-col gap-3">
        {TIERS.map((tier) => (
          <Label
            key={tier.id}
            htmlFor={`sink-tier-${tier.id}`}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 font-normal has-checked:border-primary has-checked:ring-1 has-checked:ring-ring/50"
          >
            <RadioGroupItem value={tier.id} id={`sink-tier-${tier.id}`} />
            <span className="flex-1">
              <span className="block text-xs font-medium">{tier.name}</span>
              <span className="block text-[12px] text-muted-foreground">{tier.note}</span>
            </span>
            <span className="text-sm font-semibold tabular-nums">{tier.price}</span>
          </Label>
        ))}
      </RadioGroup>
    </SinkCard>
  );
}
