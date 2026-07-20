'use client';

import { useState } from 'react';

import { Label } from '@constructive-io/ui/label';
import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';

import { Demo } from '@/components/docs/showcase-kit';

const PLANS = [
  { value: 'free', name: 'Free', detail: 'Personal projects', price: '$0' },
  { value: 'pro', name: 'Pro', detail: 'Small teams', price: '$19' },
  { value: 'scale', name: 'Scale', detail: 'Growing products', price: '$99' },
];

export function BasicRadioGroupDemo() {
  return (
    <Demo>
      <fieldset className="w-full max-w-sm">
        <legend id="radio-frequency-label" className="mb-3 text-sm font-medium">
          Notification frequency
        </legend>
        <RadioGroup
          name="notificationFrequency"
          defaultValue="weekly"
          aria-labelledby="radio-frequency-label"
        >
          {['Daily', 'Weekly', 'Monthly'].map((label) => {
            const value = label.toLowerCase();
            return (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem id={`radio-${value}`} value={value} />
                <Label htmlFor={`radio-${value}`}>{label}</Label>
              </div>
            );
          })}
        </RadioGroup>
      </fieldset>
    </Demo>
  );
}

export function ControlledRadioGroupDemo() {
  const [value, setValue] = useState('staging');

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <span id="radio-environment-label" className="text-sm font-medium">
          Default environment
        </span>
        <RadioGroup
          name="environment"
          value={value}
          onValueChange={setValue}
          aria-labelledby="radio-environment-label"
        >
          {['Production', 'Staging', 'Development'].map((label) => {
            const option = label.toLowerCase();
            return (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem id={`environment-${option}`} value={option} />
                <Label htmlFor={`environment-${option}`}>{label}</Label>
              </div>
            );
          })}
        </RadioGroup>
        <p className="text-pretty text-sm text-muted-foreground">Current value: {value}</p>
      </div>
    </Demo>
  );
}

export function RichRadioGroupDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h3 id="radio-plan-label" className="text-balance text-sm font-medium">
          Choose a plan
        </h3>
        <RadioGroup name="plan" defaultValue="pro" aria-labelledby="radio-plan-label">
          {PLANS.map((plan) => (
            <div key={plan.value} className="flex items-center gap-3 rounded-lg border p-3">
              <RadioGroupItem value={plan.value} id={`plan-${plan.value}`} />
              <div className="grid flex-1 gap-0.5 leading-none">
                <Label htmlFor={`plan-${plan.value}`}>{plan.name}</Label>
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

export function DisabledRadioGroupDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <span id="radio-region-label" className="text-sm font-medium">
          Primary region
        </span>
        <RadioGroup name="region" defaultValue="us-east" aria-labelledby="radio-region-label">
          <div className="flex items-center gap-2">
            <RadioGroupItem id="region-us-east" value="us-east" />
            <Label htmlFor="region-us-east">US East</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="region-eu-central" value="eu-central" disabled />
            <Label htmlFor="region-eu-central">EU Central (Scale plan)</Label>
          </div>
        </RadioGroup>
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return <RichRadioGroupDemo />;
}
