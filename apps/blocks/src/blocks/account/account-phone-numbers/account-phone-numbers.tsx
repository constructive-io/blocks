'use client';

import type { PhoneCountry } from '@constructive-io/ui/phone-input';

import { AccountPhoneNumbersView } from './account-phone-numbers-view';
import { useAccountPhoneNumbers, type UseAccountPhoneNumbersOptions } from './use-account-phone-numbers';

export type AccountPhoneNumbersProps = UseAccountPhoneNumbersOptions & {
  /**
   * Identifies the signed-in account the adapter is bound to. Changing it discards all local state and reloads,
   * so a response for one account can never land in another's list.
   */
  identityKey?: string;
  /** Overrides the country detected from the browser's language preferences. */
  defaultCountry?: PhoneCountry;
  className?: string;
};

/**
 * Add a phone number, text it a code, and verify it: the possession proof that turns a claimed number into a
 * sign-in identifier and second factor. Data access stays in the host through `adapter`.
 */
export function AccountPhoneNumbers({ identityKey, ...props }: AccountPhoneNumbersProps) {
  return <AccountPhoneNumbersController key={identityKey} {...props} />;
}

function AccountPhoneNumbersController({
  defaultCountry,
  className,
  ...options
}: Omit<AccountPhoneNumbersProps, 'identityKey'>) {
  return <AccountPhoneNumbersView {...useAccountPhoneNumbers(options)} defaultCountry={defaultCountry} className={className} />;
}

export { AccountPhoneNumbersView, type AccountPhoneNumbersViewProps } from './account-phone-numbers-view';
export {
  useAccountPhoneNumbers,
  type UseAccountPhoneNumbersOptions,
  type UseAccountPhoneNumbersResult
} from './use-account-phone-numbers';
export {
  AccountPhoneNumbersError,
  AccountPhoneNumbersUnavailableError,
  type AccountPhoneNumber,
  type AccountPhoneNumberRef,
  type AccountPhoneNumbersAction,
  type AccountPhoneNumbersAdapter,
  type AccountPhoneNumbersBusy,
  type AccountPhoneNumbersCodeEntry,
  type AccountPhoneNumbersFeedback,
  type AccountPhoneNumbersScope
} from './account-phone-numbers-contracts';
export {
  defaultAccountPhoneNumbersMessages,
  type AccountPhoneNumbersMessageOverrides,
  type AccountPhoneNumbersMessages
} from './messages';
