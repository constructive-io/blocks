'use client';

import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';
import { Label } from '@constructive-io/ui/label';

import { Demo } from '@/components/docs/showcase-kit';

const PLANS = [
  { value: 'free', name: 'Free', detail: 'Personal projects', price: '$0' },
  { value: 'pro', name: 'Pro', detail: 'Small teams', price: '$19' },
  { value: 'scale', name: 'Scale', detail: 'Growing products', price: '$99' },
];

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h3 className="text-balance text-sm font-medium">Choose a plan</h3>
        <RadioGroup defaultValue="pro">
          {PLANS.map((plan) => (
            <div key={plan.value} className="flex items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value={plan.value} id={`plan-${plan.value}`} />
              <div className="grid flex-1 gap-0.5 leading-none">
                <Label htmlFor={`plan-${plan.value}`} className="font-medium">
                  {plan.name}
                </Label>
                <span className="text-xs text-muted-foreground">{plan.detail}</span>
              </div>
              <span className="text-sm font-semibold">{plan.price}/mo</span>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Demo>
  );
}
