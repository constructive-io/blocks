'use client';

import { useState } from 'react';

import { MfaTotpEnroll } from '@/blocks/auth/mfa-totp-enroll/mfa-totp-enroll';
import { Demo, Segmented, type Outcome } from '@/components/docs/showcase-kit';

// A tiny data-URI QR image used as a stand-in for the real TOTP QR URL so the
// preview never makes a network request.
const DEMO_QR_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><rect width="9" height="9" fill="%23fff"/><rect x="0" y="0" width="3" height="3" fill="%23000"/><rect x="1" y="1" width="1" height="1" fill="%23fff"/><rect x="6" y="0" width="3" height="3" fill="%23000"/><rect x="7" y="1" width="1" height="1" fill="%23fff"/><rect x="0" y="6" width="3" height="3" fill="%23000"/><rect x="1" y="7" width="1" height="1" fill="%23fff"/><rect x="3" y="3" width="1" height="1" fill="%23000"/><rect x="5" y="3" width="1" height="1" fill="%23000"/><rect x="4" y="4" width="1" height="1" fill="%23000"/><rect x="3" y="5" width="1" height="1" fill="%23000"/><rect x="6" y="4" width="1" height="1" fill="%23000"/><rect x="4" y="6" width="1" height="1" fill="%23000"/><rect x="5" y="7" width="1" height="1" fill="%23000"/><rect x="6" y="6" width="1" height="1" fill="%23000"/><rect x="8" y="8" width="1" height="1" fill="%23000"/></svg>';

const DEMO_BACKUP_CODES = [
  'A1B2-C3D4',
  'E5F6-G7H8',
  'I9J0-K1L2',
  'M3N4-O5P6',
  'Q7R8-S9T0',
  'U1V2-W3X4',
  'Y5Z6-A7B8',
  'C9D0-E1F2',
];

export function BlockDemo() {
  const [outcome, setOutcome] = useState<Outcome>('success');
  // Key increments on outcome toggle to reset the block back to step 1.
  const [demoKey, setDemoKey] = useState(0);

  function handleOutcomeChange(next: Outcome) {
    setOutcome(next);
    setDemoKey((k) => k + 1);
  }

  return (
    <Demo>
      <Segmented
        label="Outcome"
        value={outcome}
        options={['success', 'error'] as const}
        onChange={handleOutcomeChange}
      />
      <MfaTotpEnroll
        key={demoKey}
        // Step 1: return QR + manual key immediately (or throw on error path).
        onSubmit={async () => {
          if (outcome === 'error') {
            throw Object.assign(new Error('Rate limited'), {
              graphQLErrors: [{ extensions: { code: 'RATE_LIMITED' } }],
            });
          }
          return {
            qrUrl: DEMO_QR_URL,
            manualKey: 'JBSWY3DPEHPK3PXP',
          };
        }}
        // Step 2: any 6-digit code is accepted on the success path.
        onConfirm={async () => {
          if (outcome === 'error') return false;
          return true;
        }}
        // Step 3: return demo backup codes.
        onGenerateCodes={async () => {
          if (outcome === 'error') throw new Error('Failed to generate codes');
          return DEMO_BACKUP_CODES;
        }}
      />
    </Demo>
  );
}
