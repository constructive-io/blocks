import { getAccountPhoneNumbersScenario } from '@/components/account-showcase/account-phone-numbers-scenarios';
import { AccountPhoneNumbersStatic } from '@/components/account-showcase/account-phone-numbers-static';

// Mixed numbers: flags, the success/warning status pair, and the add field in one card. Code entry stays closed
// because it focuses its first digit when it opens, which would pull the wall's scroll position.
const MIXED = getAccountPhoneNumbersScenario('mixed')!.state!;

/** Real account block — the same fixture the account docs preview uses. */
export function PhoneNumbersCard() {
  return <AccountPhoneNumbersStatic state={MIXED} />;
}
