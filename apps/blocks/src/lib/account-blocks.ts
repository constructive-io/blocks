export type AccountBlockApiRow = Readonly<{
  name: string;
  type: string;
  behavior: string;
}>;

export const ACCOUNT_BLOCKS = [
  {
    name: 'account-phone-numbers',
    title: 'Phone numbers',
    exportName: 'AccountPhoneNumbers',
    description:
      'A settings card for adding phone numbers, verifying them with a texted code, and removing them, with country flags, a country-aware phone field, and a six-digit code input.',
    whenToUse: [
      'Use Phone numbers on an account or security settings page when people can sign in by text message or use a phone as a second factor.',
      'Use the view on its own with useAccountPhoneNumbers when the page already owns data fetching or needs a different layout around the same states.',
      'Use a plain phone field instead when a number is only contact information and never needs a possession check.'
    ],
    usage: {
      description:
        'Pass an adapter bound to the signed-in account and key the block by that identity. The block adds, texts, verifies, and removes; your adapter makes the requests and throws on failure.',
      example: `'use client';

import {
  AccountPhoneNumbers,
  AccountPhoneNumbersError,
  type AccountPhoneNumbersAdapter
} from '@/blocks/account/account-phone-numbers/account-phone-numbers';

export function PhoneNumbersSettings({ api, userId }: Props) {
  const adapter: AccountPhoneNumbersAdapter = {
    list: () => api.phoneNumbers.list(),
    add: ({ number }) => api.phoneNumbers.create({ number }),
    // Resolve false when nothing was sent because the number is already verified.
    sendCode: ({ number }) => api.phoneNumbers.sendVerificationCode(number),
    // Resolve false for a wrong or expired code; throw for anything else.
    verify: ({ number, code }) => api.phoneNumbers.verify(number, code),
    remove: ({ id }) => api.phoneNumbers.delete(id)
  };

  return <AccountPhoneNumbers adapter={adapter} identityKey={userId} />;
}`,
      composition: `const state = useAccountPhoneNumbers({ adapter, codeLength: 6 });

return <AccountPhoneNumbersView {...state} className="max-w-2xl" />;`
    },
    state: {
      title: 'Adapter and state ownership',
      description:
        'The block reads the adapter once per mount and keeps the list, the draft, the open code field, and the request in flight locally. Change identityKey when the signed-in account changes: all local state is discarded and the list reloads, so a late response for one account never lands in another’s list.'
    },
    behavior: [
      'Numbers are E.164 end to end. The field formats as people type, rejects incomplete numbers before any request, and starts on the country from the browser’s language preferences.',
      'Adding a number texts it a code immediately and opens the code field on its row. Resend, verify, and remove feedback stays on the row that caused it.',
      'A wrong code marks every box invalid and replaces the helper line with the error and a resend link. A successful code closes the field and flips the row to Verified.',
      'Throw AccountPhoneNumbersUnavailableError when the backend has no phone support; the card shows a quiet notice instead of the list. Throw an error with a code, or a GraphQL error with extensions.code, to show the matching messages.errors entry.'
    ],
    accessibility: [
      'Status labels pair an icon with a word, so Verified, Unverified, and Primary never depend on color alone.',
      'Outcomes that are visible in the row, such as a code being sent or a number becoming verified, are also announced through a polite status region. Errors use role="alert" on the line they replace.',
      'The code field is one labelled group of digit inputs that accepts typing, paste, and one-time-code autofill, and the first digit takes focus when the field opens.',
      'Icon-only actions carry the number in their accessible name, for example “Remove +1 202 555 0143”.'
    ],
    api: [
      {
        name: 'adapter',
        type: 'AccountPhoneNumbersAdapter',
        behavior: 'Host-owned list, add, sendCode, verify, and remove calls. Read once per mount.'
      },
      {
        name: 'identityKey',
        type: 'string',
        behavior: 'Remounts the block with fresh state when the signed-in account changes.'
      },
      {
        name: 'codeLength',
        type: 'number',
        behavior: 'Digits in the texted code. Defaults to 6.'
      },
      {
        name: 'defaultCountry',
        type: 'PhoneCountry',
        behavior: 'Overrides the country detected from the browser’s language preferences.'
      },
      {
        name: 'messages',
        type: 'AccountPhoneNumbersMessageOverrides',
        behavior: 'Overrides any copy, the phone field’s picker labels, and the per-code error messages.'
      },
      {
        name: 'formatError',
        type: '(error, action) => string | undefined',
        behavior: 'Returns the message for an error, or undefined to fall back to messages.errors.'
      },
      {
        name: 'onError',
        type: '(error, action) => void',
        behavior: 'Reports every failed action. The adapter already sees every successful change.'
      },
      {
        name: 'className',
        type: 'string',
        behavior: 'Adds layout classes to the card.'
      }
    ] satisfies readonly AccountBlockApiRow[]
  }
] as const;

export type AccountBlock = (typeof ACCOUNT_BLOCKS)[number];
export type AccountBlockName = AccountBlock['name'];

const accountBlocksByName = new Map<string, AccountBlock>(ACCOUNT_BLOCKS.map((block) => [block.name, block] as const));

export function getAccountBlock(name: string): AccountBlock | undefined {
  return accountBlocksByName.get(name);
}
