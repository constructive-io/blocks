'use client';

/**
 * api-key-created-modal demo — docs-only live preview.
 *
 * A controlled Dialog that portals into #portal-root (mounted globally by
 * PreviewProvider). Opening it on mount would overlay the whole doc page, so the
 * preview uses a trigger button — click to open the one-time-key modal. The
 * Expiry toggle switches the expiresAt badge vs the "Never" fallback.
 */

import { useState } from 'react';

import { ApiKeyCreatedModal } from '@/blocks/auth/api-key-created-modal/api-key-created-modal';
import { Demo, Segmented } from '@/components/docs/showcase-kit';
import { Button } from '@constructive-io/ui/button';

type Variant = 'no-expiry' | 'with-expiry';

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>('no-expiry');

  const expiresAt =
    variant === 'with-expiry'
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString() // 90 days out
      : null;

  return (
    <Demo>
      <Segmented label="Expiry" value={variant} options={['no-expiry', 'with-expiry'] as const} onChange={setVariant} />
      <Button onClick={() => setOpen(true)}>Show created key</Button>
      <ApiKeyCreatedModal
        open={open}
        onOpenChange={setOpen}
        apiKey="cnc_live_sk_01HXYZ3K9JQPWMN7VB5R2FGTCE"
        keyName="Production deploy key"
        expiresAt={expiresAt}
        onDismissed={() => setOpen(false)}
      />
    </Demo>
  );
}
