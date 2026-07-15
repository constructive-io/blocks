'use client';

import { useState } from 'react';

import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@constructive-io/ui/stepper';

import { Demo } from '@/components/docs/showcase-kit';

const STEPS = [
  { step: 1, title: 'Account' },
  { step: 2, title: 'Organization' },
  { step: 3, title: 'Database' },
  { step: 4, title: 'Review' },
];

export function BlockDemo() {
  const [active, setActive] = useState(2);

  return (
    <Demo>
      <Stepper value={active} onValueChange={setActive} className="w-full max-w-xl">
        {STEPS.map(({ step, title }) => (
          <StepperItem key={step} step={step} className="not-last:flex-1">
            <StepperTrigger className="gap-2">
              <StepperIndicator />
              <StepperTitle>{title}</StepperTitle>
            </StepperTrigger>
            {step < STEPS.length ? <StepperSeparator /> : null}
          </StepperItem>
        ))}
      </Stepper>
    </Demo>
  );
}
