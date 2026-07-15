import { describe, it, expect } from 'vitest';

import {
  AuthError,
  DEFAULT_ERROR_MESSAGE,
  ERROR_CODES,
  ERROR_MESSAGES,
  createInvalidCredentialsError,
  getErrorMessage,
  isKnownErrorCode,
  parseGraphQLError
} from './auth-errors';

describe('AuthError', () => {
  it('maps a known code to its user-friendly message', () => {
    const err = new AuthError('INVALID_CREDENTIALS');
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(err.userMessage).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    expect(err.message).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
    expect(err.name).toBe('AuthError');
    expect(err).toBeInstanceOf(Error);
  });

  it('honors a custom message override', () => {
    const err = new AuthError('ACCOUNT_DISABLED', 'Your account has been suspended.');
    expect(err.userMessage).toBe('Your account has been suspended.');
    expect(err.code).toBe('ACCOUNT_DISABLED');
  });

  it('isCode narrows only matching AuthErrors', () => {
    const err = new AuthError('ACCOUNT_LOCKED_EXCEED_ATTEMPTS');
    expect(AuthError.isCode(err, 'ACCOUNT_LOCKED_EXCEED_ATTEMPTS')).toBe(true);
    expect(AuthError.isCode(err, 'ACCOUNT_DISABLED')).toBe(false);
    expect(AuthError.isCode(new Error('plain'), 'ACCOUNT_DISABLED')).toBe(false);
  });

  it('createInvalidCredentialsError yields the generic anti-enumeration error', () => {
    const err = createInvalidCredentialsError();
    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(err.userMessage).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
  });
});

describe('isKnownErrorCode / getErrorMessage', () => {
  it('isKnownErrorCode recognizes known codes only', () => {
    expect(isKnownErrorCode('ACCOUNT_EXISTS')).toBe(true);
    expect(isKnownErrorCode('NOT_A_REAL_CODE')).toBe(false);
    expect(isKnownErrorCode(null)).toBe(false);
  });

  it('getErrorMessage returns the mapped copy', () => {
    expect(getErrorMessage(ERROR_CODES.PASSWORD_LEN)).toBe(ERROR_MESSAGES.PASSWORD_LEN);
  });
});

describe('parseGraphQLError', () => {
  it('fast-paths an AuthError using its own message', () => {
    const result = parseGraphQLError(new AuthError('INCORRECT_PASSWORD'));
    expect(result).toMatchObject({
      code: 'INCORRECT_PASSWORD',
      message: ERROR_MESSAGES.INCORRECT_PASSWORD,
      isKnownError: true
    });
  });

  it('maps a GraphQL error via extensions.code', () => {
    const result = parseGraphQLError({ message: 'denied', extensions: { code: 'ACCOUNT_DISABLED' } });
    expect(result.code).toBe('ACCOUNT_DISABLED');
    expect(result.message).toBe(ERROR_MESSAGES.ACCOUNT_DISABLED);
    expect(result.isKnownError).toBe(true);
  });

  it('unwraps a GraphQLRequestError errors[] extensions.code', () => {
    const result = parseGraphQLError({ errors: [{ extensions: { code: 'ACCOUNT_EXISTS' } }] });
    expect(result.code).toBe('ACCOUNT_EXISTS');
    expect(result.message).toBe(ERROR_MESSAGES.ACCOUNT_EXISTS);
  });

  it('extracts a code embedded in an errors[] message via "(Code: X)"', () => {
    const result = parseGraphQLError({ errors: [{ message: 'Rejected (Code: INVITE_LIMIT)' }] });
    expect(result.code).toBe('INVITE_LIMIT');
    expect(result.message).toBe(ERROR_MESSAGES.INVITE_LIMIT);
  });

  it('matches a known code appearing in a string error', () => {
    const result = parseGraphQLError('Login blocked: ACCOUNT_LOCKED_EXCEED_ATTEMPTS');
    expect(result.code).toBe('ACCOUNT_LOCKED_EXCEED_ATTEMPTS');
    expect(result.message).toBe(ERROR_MESSAGES.ACCOUNT_LOCKED_EXCEED_ATTEMPTS);
  });

  it('reads a generic .code property', () => {
    const result = parseGraphQLError({ code: 'PASSWORD_INSECURE' });
    expect(result.code).toBe('PASSWORD_INSECURE');
    expect(result.message).toBe(ERROR_MESSAGES.PASSWORD_INSECURE);
  });

  it('handles Zod-like validation errors by shape (no Zod import)', () => {
    const zodLike = { name: 'ZodError', issues: [{ message: 'Email is required', path: ['email'] }] };
    const result = parseGraphQLError(zodLike);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Email is required');
    expect(result.isKnownError).toBe(true);
  });

  it('passes through a non-technical Error message for unknown errors', () => {
    const result = parseGraphQLError(new Error('That invite was already redeemed.'));
    expect(result.code).toBeNull();
    expect(result.isKnownError).toBe(false);
    expect(result.message).toBe('That invite was already redeemed.');
  });

  it('falls back to the default message for technical errors', () => {
    const result = parseGraphQLError(new Error('fetch failed: ECONNREFUSED'));
    expect(result.code).toBeNull();
    expect(result.message).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('honors a custom defaultMessage', () => {
    const result = parseGraphQLError(new Error('network timeout'), {
      defaultMessage: 'Unable to sign in. Please try again.'
    });
    expect(result.message).toBe('Unable to sign in. Please try again.');
  });

  it('surfaces a non-technical inner message when the outer error is technical', () => {
    const err = Object.assign(new Error('GraphQL request failed'), {
      errors: [{ message: 'That email is already on the waitlist.' }]
    });
    const result = parseGraphQLError(err);
    expect(result.message).toBe('That email is already on the waitlist.');
  });

  it('extends and overrides messages via customMessages', () => {
    const extended = parseGraphQLError(
      { extensions: { code: 'CUSTOM_X' } },
      { customMessages: { CUSTOM_X: 'A custom thing happened.' } }
    );
    expect(extended.code).toBe('CUSTOM_X');
    expect(extended.message).toBe('A custom thing happened.');
    expect(extended.isKnownError).toBe(true);

    const overridden = parseGraphQLError(
      { extensions: { code: 'INVALID_CREDENTIALS' } },
      { customMessages: { INVALID_CREDENTIALS: 'Wrong email or password, friend.' } }
    );
    expect(overridden.message).toBe('Wrong email or password, friend.');
  });

  it('returns the default message and preserves originalError for unknown shapes', () => {
    const result = parseGraphQLError(null);
    expect(result.code).toBeNull();
    expect(result.message).toBe(DEFAULT_ERROR_MESSAGE);
    expect(result.isKnownError).toBe(false);
    expect(result.originalError).toBeNull();
  });
});
