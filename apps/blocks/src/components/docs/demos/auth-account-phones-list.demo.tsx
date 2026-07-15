'use client';

import { useState } from 'react';

import { AccountPhonesList, type PhoneRow } from '@/blocks/auth/account-phones-list/account-phones-list';

import { Demo } from '@/components/docs/showcase-kit';

const now = () => new Date().toISOString();

export function BlockDemo() {
  const [_lastEvent, setLastEvent] = useState<string | null>(null);

  return (
    <Demo>
      <AccountPhonesList
        className="max-w-2xl"
        maxPhones={5}
        defaultCountry="+1"
        onSubmitAdd={async (cc, number) => {
          const row: PhoneRow = {
            id: `ph_${Date.now()}`,
            cc,
            number,
            isPrimary: false,
            isVerified: false,
            createdAt: now(),
          };
          return row;
        }}
        onSubmitSendOtp={async (_cc, _number) => {
          // No-op: OTP sent in demo
        }}
        onSubmitVerifyOtp={async (_phoneE164, _otp) => ({
          id: `ph_${Date.now()}`,
          cc: '+1',
          number: '5550001234',
          isPrimary: false,
          isVerified: true,
          createdAt: now(),
        })}
        onSubmitSetPrimary={async (phoneId) => ({
          id: phoneId,
          cc: '+1',
          number: '5550001234',
          isPrimary: true,
          isVerified: true,
          createdAt: now(),
        })}
        onSubmitDelete={async (_phoneId) => {
          // No-op: deleted in demo
        }}
        onMessage={(event) => setLastEvent(event.key)}
      />
    </Demo>
  );
}
