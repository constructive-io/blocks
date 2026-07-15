/**
 * magic-link-callback-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError`
 * as `customMessages`. The `PROCEDURE_NOT_FOUND` key is required because
 * `sign_in_magic_link` is a backend-pending procedure; it surfaces a clear
 * message if the host SDK is installed before the DB proc is deployed.
 *
 * (sdk-binding-contract.md §10 — backend-pending block: requires.json names
 * the absent op, messages.errors.PROCEDURE_NOT_FOUND surfaces the gap.)
 */

export type MagicLinkCallbackPageMessages = {
  loadingTitle: string;
  loadingDescription: string;
  successTitle: string;
  successDescription: string;
  expiredTitle: string;
  expiredDescription: string;
  expiredRequestNewLink: string;
  invalidTitle: string;
  invalidDescription: string;
  invalidSignInLink: string;
  missingTokenTitle: string;
  missingTokenDescription: string;
  missingTokenSignInLink: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    EXPIRED_TOKEN: string;
    INVALID_TOKEN: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level is shallow-partial; `errors` is itself
 * partial so a host can override a single error code without restating the map.
 */
export type MagicLinkCallbackPageMessageOverrides = Partial<
  Omit<MagicLinkCallbackPageMessages, 'errors'>
> & {
  errors?: Partial<MagicLinkCallbackPageMessages['errors']>;
};

export const defaultMagicLinkCallbackPageMessages: MagicLinkCallbackPageMessages = {
  loadingTitle: 'Signing you in…',
  loadingDescription: 'Please wait while we verify your link.',
  successTitle: 'Signed in',
  successDescription: 'You have been signed in successfully. Redirecting…',
  expiredTitle: 'Link expired',
  expiredDescription:
    'This sign-in link has expired or has already been used. Request a new one.',
  expiredRequestNewLink: 'Request a new link',
  invalidTitle: 'Invalid link',
  invalidDescription: 'This sign-in link is invalid.',
  invalidSignInLink: 'Back to sign in',
  missingTokenTitle: 'Invalid link',
  missingTokenDescription:
    'This sign-in link is missing required parameters. Try clicking the link in your email again.',
  missingTokenSignInLink: 'Back to sign in',
  errors: {
    EXPIRED_TOKEN: 'This sign-in link has expired.',
    INVALID_TOKEN: 'This sign-in link is invalid.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Sign-in failed. Please try again.'
  }
};
