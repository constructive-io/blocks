'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { StepUpProvider } from '@/blocks/auth/use-step-up/step-up-provider';
import { StepUpError, useStepUp } from '@/blocks/auth/use-step-up/use-step-up';

import { Demo } from '../showcase-kit';

function UseStepUpDemo() {
  const stepUp = useStepUp();
  const [last, setLast] = useState<string | null>(null);

  async function run() {
    try {
      await stepUp({ tier: 'high' });
      setLast('resolved — action authorized');
    } catch (err) {
      setLast(err instanceof StepUpError ? `rejected — ${err.reason}` : 'rejected — error');
    }
  }

  return (
    <Demo>
      <Button variant="destructive" onClick={run}>
        Delete account
      </Button>
      {last ? <p className="text-pretty mt-4 text-sm text-muted-foreground">stepUp(): {last}</p> : null}
    </Demo>
  );
}

export function BlockDemo() {
  return (
    <StepUpProvider>
      <UseStepUpDemo />
    </StepUpProvider>
  );
}
