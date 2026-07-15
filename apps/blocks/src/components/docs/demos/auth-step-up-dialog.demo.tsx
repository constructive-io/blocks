'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { StepUpDialog } from '@/blocks/auth/step-up-dialog/step-up-dialog';

import { Demo, Segmented } from '../showcase-kit';

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'password' | 'mfa'>('password');
  const [last, setLast] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Variant" value={type} options={['password', 'mfa'] as const} onChange={setType} />
      <Button onClick={() => setOpen(true)}>Verify identity</Button>
      {last ? <p className="text-pretty mt-4 text-sm text-muted-foreground">Last result: {last}</p> : null}
      <StepUpDialog
        open={open}
        type={type}
        onVerify={(result) => {
          setOpen(false);
          setLast(result.ok ? 'verified' : result.reason);
        }}
      />
    </Demo>
  );
}
