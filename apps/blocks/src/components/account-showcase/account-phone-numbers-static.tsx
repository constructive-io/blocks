'use client';

import { useState, type FormEvent } from 'react';

import { AccountPhoneNumbersView } from '@/blocks/account/account-phone-numbers/account-phone-numbers';

import type { AccountPhoneNumbersScenarioState } from './account-phone-numbers-scenarios';

const prevent = (event: FormEvent) => event.preventDefault();
const noop = () => {};

/**
 * One fixed state of the phone numbers block that stays typeable: the draft and code are local, and every action
 * is a no-op. Key it by scenario so switching scenarios starts from that scenario's values.
 */
export function AccountPhoneNumbersStatic({
  state,
  className
}: {
  state: AccountPhoneNumbersScenarioState;
  className?: string;
}) {
  const [draft, setDraft] = useState(state.draft);
  const [codeEntry, setCodeEntry] = useState(state.codeEntry);
  return (
    <AccountPhoneNumbersView
      {...state}
      className={className}
      draft={draft}
      codeEntry={codeEntry}
      onDraftChange={setDraft}
      onCodeChange={(code) => setCodeEntry((entry) => entry && { ...entry, code })}
      onAdd={prevent}
      onSendCode={noop}
      onVerify={(_, event) => prevent(event)}
      onCancelCode={noop}
      onRemove={noop}
      onRetry={noop}
    />
  );
}
