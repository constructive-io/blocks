/**
 * mfa-totp-challenge-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4): top-level camelCase
 * keys are UI copy for the page's own error states (missing token, expired token).
 * The card's own messages are handled by auth-mfa-totp-challenge — these are
 * only for the page wrapper states.
 */

export type MfaTotpChallengePageMessages = {
  /** Shown when ?token= is absent from the URL */
  missingTokenTitle: string;
  missingTokenDescription: string;
  missingTokenCta: string;
  /** Shown when the challenge token has expired (EXPIRED_TOKEN from the card's onError) */
  expiredTokenTitle: string;
  expiredTokenDescription: string;
  expiredTokenCta: string;
};

export const defaultMfaTotpChallengePageMessages: MfaTotpChallengePageMessages = {
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This sign-in link is missing required parameters. Please sign in again.',
  missingTokenCta: 'Back to sign in',
  expiredTokenTitle: 'Session expired',
  expiredTokenDescription:
    'Your sign-in session has expired. Please sign in again to get a new verification link.',
  expiredTokenCta: 'Sign in again'
};
