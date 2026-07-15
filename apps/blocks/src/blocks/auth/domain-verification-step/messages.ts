/**
 * domain-verification-step — message catalog
 *
 * v2 STUB — no data binding yet (sdk-binding-contract.md: deferred SSO backend).
 * Top-level camelCase keys are UI copy. There are no backend error codes in v1
 * because the block performs no network operations.
 */

export type AuthDomainVerificationStepMessages = {
  title: string;
  description: string;
  txtRecordNameLabel: string;
  txtRecordValueLabel: string;
  copyLabel: string;
  copiedLabel: string;
  checkNowLabel: string;
  statusWaiting: string;
  statusVerified: string;
  statusTimeout: string;
  statusError: string;
  deferredNotice: string;
  propagationNote: string;
};

export const defaultAuthDomainVerificationStepMessages: AuthDomainVerificationStepMessages = {
  title: 'Verify domain ownership',
  description:
    'Add the DNS TXT record below to your domain to prove ownership. DNS changes can take up to 48 hours to propagate.',
  txtRecordNameLabel: 'TXT record name',
  txtRecordValueLabel: 'TXT record value',
  copyLabel: 'Copy',
  copiedLabel: 'Copied!',
  checkNowLabel: 'Check now',
  statusWaiting: 'Waiting for DNS propagation…',
  statusVerified: 'Domain verified.',
  statusTimeout: 'Verification timed out. Check that the TXT record was added correctly.',
  statusError: 'Verification error. Please try again.',
  deferredNotice: 'Domain verification requires a server-side DNS backend that has not been deployed yet.',
  propagationNote: 'DNS propagation can take up to 48 hours. The check button lets you verify manually at any time.'
};
