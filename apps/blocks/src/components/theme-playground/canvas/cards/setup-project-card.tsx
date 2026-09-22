import { Check } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@constructive-io/ui/stepper';

import { SinkCard } from './sink-card';

const STEPS = ['Project', 'Database', 'Deploy'];

export function SetupProjectCard() {
  return (
    <SinkCard title="Set up your project">
      <Stepper defaultValue={2} aria-label="Project setup progress">
        {STEPS.map((step, index) => (
          <StepperItem key={step} step={index + 1} className="flex-1">
            <StepperTrigger>
              <StepperIndicator>
                {index === 0 ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </StepperIndicator>
              <StepperTitle>{step}</StepperTitle>
            </StepperTrigger>
            {index < STEPS.length - 1 ? <StepperSeparator /> : null}
          </StepperItem>
        ))}
      </Stepper>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" size="sm">
          Back
        </Button>
        <Button size="sm">Continue</Button>
      </div>
    </SinkCard>
  );
}
