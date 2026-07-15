'use client';

import { MfaBackupCodesDisplay } from '@/blocks/auth/mfa-backup-codes-display/mfa-backup-codes-display';
import { Demo } from '@/components/docs/showcase-kit';

const DEMO_CODES = [
  'a3f7-k9px',
  'b8m2-r4tz',
  'c1n6-w5vy',
  'd9q4-j2lx',
  'e5s8-h7nb',
  'f2t1-g6mc',
  'g7u3-e0qk',
  'h4v9-d3fs',
];

export function BlockDemo() {
  return (
    <Demo>
      <MfaBackupCodesDisplay
        codes={DEMO_CODES}
        requireConfirmation={true}
        onConfirm={() => undefined}
      />
    </Demo>
  );
}
