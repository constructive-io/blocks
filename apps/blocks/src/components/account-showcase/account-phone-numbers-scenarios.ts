import {
  defaultAccountPhoneNumbersMessages,
  type AccountPhoneNumber,
  type AccountPhoneNumbersAdapter,
  type AccountPhoneNumbersViewProps
} from '@/blocks/account/account-phone-numbers/account-phone-numbers';

export type AccountPhoneNumbersScenarioState = Pick<
  AccountPhoneNumbersViewProps,
  'phones' | 'loading' | 'unavailable' | 'feedback' | 'draft' | 'busy' | 'codeEntry'
>;

export type AccountPhoneNumbersScenario = Readonly<{
  value: string;
  label: string;
  group: 'Interactive' | 'Loading' | 'List' | 'Verification' | 'Add a number' | 'Errors';
  state?: AccountPhoneNumbersScenarioState;
}>;

const unverified: AccountPhoneNumber = { id: 'p1', number: '+12025550143', isVerified: false, isPrimary: false };
const verified: AccountPhoneNumber = { id: 'p2', number: '+447400123456', isVerified: true, isPrimary: false };
const primary: AccountPhoneNumber = { id: 'p3', number: '+14155550132', isVerified: true, isPrimary: true };
const international: AccountPhoneNumber = { id: 'p4', number: '+4915112345678', isVerified: false, isPrimary: false };

const base: AccountPhoneNumbersScenarioState = { phones: [], loading: false, draft: '' };
const { errors, invalidNumber, wrongCode } = defaultAccountPhoneNumbersMessages;
const onRow = (phoneId: string, feedback: { error?: string; notice?: string }) =>
  ({ scope: 'phone', phoneId, ...feedback }) as const;
const onAdd = (error: string) => ({ scope: 'add', error }) as const;
const busyRow = (phoneId: string, action: 'send' | 'verify' | 'remove') => ({ scope: 'phone', phoneId, action }) as const;

function scenario(
  value: string,
  label: string,
  group: AccountPhoneNumbersScenario['group'],
  state: Partial<AccountPhoneNumbersScenarioState>
): AccountPhoneNumbersScenario {
  return { value, label, group, state: { ...base, ...state } };
}

export const ACCOUNT_PHONE_NUMBERS_SCENARIOS: readonly AccountPhoneNumbersScenario[] = [
  { value: 'live', label: 'Live (in-memory adapter)', group: 'Interactive' },
  scenario('loading', 'Loading', 'Loading', { phones: null, loading: true }),
  scenario('load-failed', 'Load failed', 'Loading', { phones: null, feedback: { scope: 'card', error: 'Failed to fetch' } }),
  scenario('unavailable', 'Unavailable', 'Loading', { phones: null, unavailable: true }),
  scenario('empty', 'Empty', 'List', {}),
  scenario('mixed', 'Mixed numbers', 'List', { phones: [primary, verified, unverified] }),
  scenario('many', 'Many numbers', 'List', { phones: [primary, verified, unverified, international] }),
  scenario('refreshing', 'Refreshing', 'List', { phones: [primary, unverified], loading: true }),
  scenario('removing', 'Removing', 'List', { phones: [primary, verified], busy: busyRow(verified.id, 'remove') }),
  scenario('sending', 'Sending code', 'Verification', { phones: [primary, unverified], busy: busyRow(unverified.id, 'send') }),
  scenario('code-sent', 'Code sent', 'Verification', {
    phones: [primary, unverified],
    codeEntry: { phoneId: unverified.id, code: '' },
    feedback: onRow(unverified.id, { notice: 'We texted a code to +1 202 555 0143.' })
  }),
  scenario('verifying', 'Verifying', 'Verification', {
    phones: [primary, unverified],
    codeEntry: { phoneId: unverified.id, code: '123456' },
    busy: busyRow(unverified.id, 'verify')
  }),
  scenario('wrong-code', 'Wrong code', 'Verification', {
    phones: [primary, unverified],
    codeEntry: { phoneId: unverified.id, code: '000000' },
    feedback: onRow(unverified.id, { error: wrongCode })
  }),
  scenario('just-verified', 'Just verified', 'Verification', {
    phones: [primary, { ...unverified, isVerified: true }],
    feedback: onRow(unverified.id, { notice: '+1 202 555 0143 is verified.' })
  }),
  scenario('draft', 'Number typed', 'Add a number', { phones: [primary], draft: '+12015550123' }),
  scenario('adding', 'Adding', 'Add a number', { phones: [primary], draft: '+12015550123', busy: { scope: 'add' } }),
  scenario('invalid', 'Incomplete number', 'Add a number', {
    phones: [primary],
    draft: '+1555',
    feedback: onAdd(invalidNumber)
  }),
  scenario('claim-limit', 'Claim limit', 'Errors', {
    phones: [unverified, international],
    draft: '+16502530000',
    feedback: onAdd(errors.IDENTIFIER_CLAIM_LIMIT)
  }),
  scenario('throttled', 'Throttled', 'Errors', {
    phones: [unverified],
    feedback: onRow(unverified.id, { error: errors.TOO_MANY_REQUESTS })
  }),
  scenario('verified-elsewhere', 'Verified elsewhere', 'Errors', {
    phones: [unverified],
    codeEntry: { phoneId: unverified.id, code: '123456' },
    feedback: onRow(unverified.id, { error: errors.IDENTIFIER_VERIFIED_ELSEWHERE })
  }),
  scenario('sms-disabled', 'Text messages disabled', 'Errors', {
    phones: [unverified],
    feedback: onRow(unverified.id, { error: errors.SMS_VERIFICATION_DISABLED })
  })
];

export const LIVE_VERIFICATION_CODE = '123456';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A deterministic stand-in for a real backend: any number can be added, and 123456 verifies it. */
export function createInMemoryPhoneNumbersAdapter(
  initial: readonly AccountPhoneNumber[] = [primary, unverified]
): AccountPhoneNumbersAdapter {
  let rows = [...initial];
  let nextId = 1;
  return {
    async list() {
      await wait(500);
      return rows;
    },
    async add({ number }) {
      await wait(400);
      const phone = { id: `live-${nextId++}`, number, isVerified: false, isPrimary: rows.length === 0 };
      rows = [...rows, phone];
      return phone;
    },
    async sendCode({ id }) {
      await wait(400);
      return !rows.find((row) => row.id === id)?.isVerified;
    },
    async verify({ id, code }) {
      await wait(500);
      if (code !== LIVE_VERIFICATION_CODE) return false;
      rows = rows.map((row) => (row.id === id ? { ...row, isVerified: true } : row));
      return true;
    },
    async remove({ id }) {
      await wait(300);
      rows = rows.filter((row) => row.id !== id);
    }
  };
}

export function getAccountPhoneNumbersScenario(value: string) {
  return ACCOUNT_PHONE_NUMBERS_SCENARIOS.find((scenario) => scenario.value === value);
}
