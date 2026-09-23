/**
 * A phone number the signed-in account has claimed. It stays unverified until the account proves possession
 * with a text-message code, and only a verified number can sign in or back a second factor.
 */
export type AccountPhoneNumber = Readonly<{
  id: string;
  /** E.164, e.g. `+12025550143`. */
  number: string;
  isVerified: boolean;
  isPrimary: boolean;
}>;

export type AccountPhoneNumberRef = Readonly<{ id: string; number: string }>;

/**
 * Host-owned data access. The block never builds requests or holds credentials: bind each call to the identity
 * the host rendered it for, and throw on failure. Throw `AccountPhoneNumbersUnavailableError` when the backend
 * has no phone support at all, and an error with a `code` (an `AccountPhoneNumbersError`, or a GraphQL error's
 * `extensions.code`) to pick a message from `messages.errors`.
 */
export type AccountPhoneNumbersAdapter = Readonly<{
  list: () => Promise<readonly AccountPhoneNumber[]>;
  /** Claims a number, already normalized to E.164. The block texts it a code right after. */
  add: (input: Readonly<{ number: string }>) => Promise<AccountPhoneNumber>;
  /** Texts a code to a claimed number; resolve `false` when nothing was sent because it is already verified. */
  sendCode: (input: AccountPhoneNumberRef) => Promise<boolean>;
  /** Resolves `true` when the code matched and the number is now verified, `false` for a wrong or expired code. */
  verify: (input: AccountPhoneNumberRef & Readonly<{ code: string }>) => Promise<boolean>;
  remove: (input: AccountPhoneNumberRef) => Promise<void>;
}>;

export type AccountPhoneNumbersAction = 'load' | 'add' | 'send' | 'verify' | 'remove';

/** Where a message belongs: the whole card, the add form, or one number's row. */
export type AccountPhoneNumbersScope = Readonly<
  { scope: 'card' } | { scope: 'add' } | { scope: 'phone'; phoneId: string }
>;

/** One visible error and/or announced notice, shown in the place its scope names. */
export type AccountPhoneNumbersFeedback = AccountPhoneNumbersScope & Readonly<{ error?: string; notice?: string }>;

/** The request in flight: claiming a new number, or an action on one row. */
export type AccountPhoneNumbersBusy = Readonly<
  { scope: 'add' } | { scope: 'phone'; phoneId: string; action: 'send' | 'verify' | 'remove' }
>;

/** The open code field and what has been typed into it. */
export type AccountPhoneNumbersCodeEntry = Readonly<{ phoneId: string; code: string }>;

/** Carries a backend error code so the block can show the matching message from `messages.errors`. */
export class AccountPhoneNumbersError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AccountPhoneNumbersError';
    this.code = code;
  }
}

/** The authentication service has no phone-number support; the block shows a quiet notice instead of the list. */
export class AccountPhoneNumbersUnavailableError extends Error {
  constructor(message = 'Phone numbers are not available on this authentication service.') {
    super(message);
    this.name = 'AccountPhoneNumbersUnavailableError';
  }
}
