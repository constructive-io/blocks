'use client';

import * as React from 'react';
import { Button } from '@constructive-io/ui/button';
import { Separator } from '@constructive-io/ui/separator';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@constructive-io/ui/stepper';

export interface AppWorkflowStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
}

export interface AppWorkflowStepperProps {
  steps: readonly AppWorkflowStep[];
  activeStep: number;
  onActiveStepChange: (step: number) => void;
  onComplete?: () => void;
  completeLabel?: string;
  canContinue?: boolean;
  busy?: boolean;
  error?: string;
}

/** A controlled multi-step composition surface, deliberately without workflow persistence. */
export function AppWorkflowStepper({
  steps,
  activeStep,
  onActiveStepChange,
  onComplete,
  completeLabel = 'Complete',
  canContinue = true,
  busy = false,
  error
}: AppWorkflowStepperProps) {
  const current = steps[activeStep];
  if (!current) return null;
  const last = activeStep === steps.length - 1;

  return (
    <section aria-label="Workflow steps" className="flex flex-col gap-5">
      <Stepper onValueChange={(step) => onActiveStepChange(step - 1)} value={activeStep + 1}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <StepperItem
              completed={step.completed}
              disabled={step.disabled || busy}
              loading={busy && index === activeStep}
              step={index + 1}
            >
              <StepperTrigger aria-label={`Go to ${step.title}`} static>
                <StepperIndicator />
                <span className="hidden flex-col items-start gap-1 sm:flex">
                  <StepperTitle>{step.title}</StepperTitle>
                  {step.description ? (
                    <StepperDescription>{step.description}</StepperDescription>
                  ) : null}
                </span>
              </StepperTrigger>
            </StepperItem>
            {index < steps.length - 1 ? <StepperSeparator /> : null}
          </React.Fragment>
        ))}
      </Stepper>

      <div aria-labelledby={`app-workflow-step-${current.id}`}>
        <h2 className="sr-only" id={`app-workflow-step-${current.id}`}>{current.title}</h2>
        {current.content}
      </div>

      {error ? <p className="text-destructive text-pretty text-sm" role="alert">{error}</p> : null}
      <Separator />
      <footer className="flex flex-wrap items-center justify-between gap-3">
        <Button
          disabled={activeStep === 0 || busy}
          onClick={() => onActiveStepChange(activeStep - 1)}
          variant="outline"
        >
          Back
        </Button>
        <Button
          disabled={!canContinue || busy}
          onClick={() => {
            if (last) onComplete?.();
            else onActiveStepChange(activeStep + 1);
          }}
        >
          {last ? completeLabel : 'Continue'}
        </Button>
      </footer>
    </section>
  );
}
