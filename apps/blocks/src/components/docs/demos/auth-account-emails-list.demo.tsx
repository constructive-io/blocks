'use client';

import { AccountEmailsList } from '@/blocks/auth/account-emails-list/account-emails-list';

export function BlockDemo() {
  const now = () => new Date().toISOString();

  // The list is seeded by the mock adapter's emails query; the mutating dialogs
  // resolve through these override seams (no re-fetch happens in the preview).
  return (
    <AccountEmailsList
      maxEmails={10}
      onSubmitAdd={async (emailAddress) => ({
        id: `eml_${Date.now()}`,
        email: emailAddress,
        isPrimary: false,
        isVerified: false,
        name: null,
        createdAt: now(),
      })}
      onSubmitSetPrimary={async (emailId) => ({
        id: emailId,
        email: 'demo@example.com',
        isPrimary: true,
        isVerified: true,
        name: null,
        createdAt: now(),
      })}
      onSubmitDelete={async () => {}}
      onSubmitResendVerification={async () => {}}
    />
  );
}
