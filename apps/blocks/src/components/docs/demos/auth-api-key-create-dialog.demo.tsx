'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { ApiKeyCreateDialog } from '@/blocks/auth/api-key-create-dialog/api-key-create-dialog';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <Demo>
      <Segmented label="Outcome" value={outcome} options={['success', 'error'] as const} onChange={setOutcome} />
      <Button variant="outline" onClick={() => setOpen(true)}>
        Create API key
      </Button>
      {lastResult ? (
        <p className="mt-4 text-sm text-muted-foreground">{lastResult}</p>
      ) : null}
      <ApiKeyCreateDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (input) => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Permission denied'), {
              graphQLErrors: [{ extensions: { code: 'UNKNOWN_ERROR' } }],
            });
          }
          return {
            keyId: 'key_demo_01',
            rawKey: 'cnc_live_demo_xk9rp2qnz74m',
            name: input.name,
            expiresAt: input.expiresIn ? new Date(Date.now() + 30 * 864e5).toISOString() : null,
          };
        }}
        onSuccess={(result) => {
          setOpen(false);
          setLastResult(`Key created: ${result.name} (${result.keyId})`);
        }}
        onError={(err) => {
          setLastResult(`Error: ${err.message}`);
        }}
      />
    </Demo>
  );
}
