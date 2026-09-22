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
      {/* Labels sit under their indicators so three steps fit a 352px card; the
          connector is positioned against the indicator row instead of flexing
          into whatever width the label leaves over. */}
      <Stepper defaultValue={2} aria-label="Project setup progress" className="items-start">
        {STEPS.map((step, index) => (
          <StepperItem key={step} step={index + 1} className="relative flex-1 items-start">
            <StepperTrigger className="flex-col items-start gap-2 rounded-md">
              <StepperIndicator>
                {index === 0 ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </StepperIndicator>
              <StepperTitle className="text-[13px]">{step}</StepperTitle>
            </StepperTrigger>
            {index < STEPS.length - 1 ? (
              <StepperSeparator className="absolute top-3 left-[calc(1.5rem+0.5rem)] m-0 h-0.5 w-[calc(100%-1.5rem-1rem)] flex-none -translate-y-1/2" />
            ) : null}
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
