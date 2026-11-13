/**
 * Tests for error-handler.ts — the data-layer shim over @constructive-io/errors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	CONSTRAINT_MESSAGES,
	ConstructiveError,
	classify,
	createError,
	getConstraintMessage,
	getErrorCode,
	getHumanReadableError,
	isAuthenticationError,
	isPublicCode,
	isRetryable,
	parseError,
	parseGraphQLError,
	withRetry,
} from '../error-handler';

describe('error-handler', () => {
	describe('getErrorCode', () => {
		it('reads the code from GraphQL extensions', () => {
			expect(getErrorCode({ message: 'x', extensions: { code: 'FORBIDDEN' } })).toBe('FORBIDDEN');
		});

		it('maps a PostgreSQL SQLSTATE to a canonical code', () => {
			expect(getErrorCode({ message: 'dup', code: '23505' })).toBe('UNIQUE_VIOLATION');
		});

		it('reads structured PostgreSQL DETAIL json', () => {
			const detail = JSON.stringify({ code: 'ACCOUNT_EXISTS', context: { email: 'a@b' }, class: 'public' });
			expect(getErrorCode({ message: 'ACCOUNT_EXISTS', detail })).toBe('ACCOUNT_EXISTS');
		});

		it('recognizes a bare canonical code message', () => {
			expect(getErrorCode(new Error('UNIQUE_VIOLATION'))).toBe('UNIQUE_VIOLATION');
		});

		it('returns null for an unrecognized error', () => {
			expect(getErrorCode(new Error('something random happened'))).toBeNull();
		});
	});

	describe('parseError / parseGraphQLError', () => {
		it('normalizes any input into a ConstructiveError', () => {
			const err = parseError({ message: 'nope', extensions: { code: 'FORBIDDEN' } });
			expect(err).toBeInstanceOf(ConstructiveError);
			expect(err.code).toBe('FORBIDDEN');
			expect(err.errorClass).toBe('public');
			expect(err.http).toBe(403);
		});

		it('carries structured context from DETAIL', () => {
			const detail = JSON.stringify({ code: 'UNIQUE_VIOLATION', context: { constraint: 'users_email_key' }, class: 'public' });
			const err = parseGraphQLError({ message: 'UNIQUE_VIOLATION', detail });
			expect(err.code).toBe('UNIQUE_VIOLATION');
			expect(err.context?.constraint).toBe('users_email_key');
		});

		it('falls back to UNKNOWN_ERROR for unrecognized errors', () => {
			const err = parseError(new Error('boom'));
			expect(err.code).toBe('UNKNOWN_ERROR');
			expect(err.errorClass).toBe('internal');
		});
	});

	describe('classification', () => {
		it('classifies public vs internal codes', () => {
			expect(classify('FORBIDDEN')).toBe('public');
			expect(isPublicCode('FORBIDDEN')).toBe(true);
			expect(classify('UNKNOWN_ERROR')).toBe('internal');
			expect(isPublicCode('UNKNOWN_ERROR')).toBe(false);
		});

		it('fails closed for unknown codes', () => {
			expect(classify('NOT_A_REAL_CODE')).toBe('internal');
			expect(classify(null)).toBe('internal');
		});
	});

	describe('isAuthenticationError', () => {
		// Only an HTTP 401 or the GraphQL code UNAUTHENTICATED means the session ended.
		// A permission error whose text mentions "unauthorized" must not sign the user out.
		it('is true for the UNAUTHENTICATED code in GraphQL extensions', () => {
			expect(isAuthenticationError({ message: 'x', extensions: { code: 'UNAUTHENTICATED' } })).toBe(true);
			// Any error of a response, as a `{ errors }` body or a client error's `response`.
			expect(
				isAuthenticationError({
					errors: [
						{ message: 'Forbidden', extensions: { code: 'FORBIDDEN' } },
						{ message: 'x', extensions: { code: 'UNAUTHENTICATED' } },
					],
				}),
			).toBe(true);
			expect(
				isAuthenticationError({ response: { status: 200, errors: [{ message: 'x', extensions: { code: 'UNAUTHENTICATED' } }] } }),
			).toBe(true);
			// The typed error a transport creates for that code or for a 401.
			expect(isAuthenticationError(createError.unauthorized())).toBe(true);
		});

		it('is true for BAD_TOKEN_DEFINITION as a code, the server rejecting the token', () => {
			expect(isAuthenticationError({ message: 'x', extensions: { code: 'BAD_TOKEN_DEFINITION' } })).toBe(true);
			expect(isAuthenticationError({ response: { errors: [{ message: 'x', extensions: { code: 'BAD_TOKEN_DEFINITION' } }] } })).toBe(true);
			expect(isAuthenticationError(createError.graphql('Token rejected', 'BAD_TOKEN_DEFINITION'))).toBe(true);
		});

		it('is true for an HTTP 401', () => {
			expect(isAuthenticationError({ status: 401 })).toBe(true);
			expect(isAuthenticationError({ statusCode: 401 })).toBe(true);
			expect(isAuthenticationError({ response: { status: 401 } })).toBe(true);
		});

		it('never reads the message text', () => {
			expect(isAuthenticationError(new Error('UNAUTHENTICATED'))).toBe(false);
			expect(isAuthenticationError('UNAUTHENTICATED')).toBe(false);
			expect(isAuthenticationError(new Error('authentication required'))).toBe(false);
			expect(isAuthenticationError(new Error('Your session expired'))).toBe(false);
			expect(isAuthenticationError({ message: 'permission denied: unauthorized role', extensions: { code: 'FORBIDDEN' } })).toBe(false);
			expect(isAuthenticationError(new Error('BAD_TOKEN_DEFINITION'))).toBe(false);
			expect(isAuthenticationError({ message: 'BAD_TOKEN_DEFINITION', extensions: { code: 'FORBIDDEN' } })).toBe(false);
		});

		it('is false for other codes and statuses', () => {
			expect(isAuthenticationError(new Error('disk full'))).toBe(false);
			expect(isAuthenticationError({ extensions: { code: 'FORBIDDEN' } })).toBe(false);
			expect(isAuthenticationError({ status: 403 })).toBe(false);
			expect(isAuthenticationError(createError.forbidden())).toBe(false);
			expect(isAuthenticationError(null)).toBe(false);
		});
	});

	describe('isRetryable', () => {
		it.each([
			['NETWORK_ERROR', true],
			['TIMEOUT_ERROR', true],
			['FORBIDDEN', false],
			['UNIQUE_VIOLATION', false],
		] as const)('%s => %s', (code, expected) => {
			expect(isRetryable({ extensions: { code } })).toBe(expected);
		});
	});

	describe('withRetry', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it('retries a retryable failure then resolves', async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(createError.network())
				.mockResolvedValueOnce('ok');
			const promise = withRetry(fn, 3, 0);
			await expect(promise).resolves.toBe('ok');
			expect(fn).toHaveBeenCalledTimes(2);
		});

		it('rejects with a ConstructiveError on a non-retryable failure', async () => {
			const fn = vi.fn().mockRejectedValue(createError.forbidden());
			await expect(withRetry(fn, 3, 0)).rejects.toBeInstanceOf(ConstructiveError);
			expect(fn).toHaveBeenCalledTimes(1);
		});
	});

	describe('createError factories', () => {
		it('maps a coded GraphQL error through graphql()', () => {
			expect(createError.graphql('denied', 'FORBIDDEN').code).toBe('FORBIDDEN');
		});
	});

	describe('constraint messages', () => {
		it('matches a suffix pattern', () => {
			expect(getConstraintMessage('users_email_key')).toBe(CONSTRAINT_MESSAGES['*_email_key']);
		});

		it('returns undefined for unknown constraints', () => {
			expect(getConstraintMessage('unrelated')).toBeUndefined();
			expect(getConstraintMessage(null)).toBeUndefined();
		});
	});

	describe('getHumanReadableError', () => {
		it('prefers the friendly constraint overlay', () => {
			const detail = JSON.stringify({
				code: 'UNIQUE_VIOLATION',
				context: { constraint: 'users_email_key' },
				class: 'public',
			});
			expect(getHumanReadableError({ message: 'UNIQUE_VIOLATION', detail })).toBe(
				CONSTRAINT_MESSAGES['*_email_key'],
			);
		});

		it('falls back to the canonical message', () => {
			expect(getHumanReadableError({ extensions: { code: 'FORBIDDEN' } })).toBe(
				'You do not have permission to do that.',
			);
		});
	});
});
