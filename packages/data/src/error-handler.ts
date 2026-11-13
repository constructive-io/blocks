/**
 * Data-layer error handling.
 *
 * The canonical error system lives in `@constructive-io/errors`: one machine
 * `code`, structured `context`, public/internal `class`, localizable messages,
 * and cross-source parsing (PostgreSQL `DETAIL`, GraphQL `extensions`, message
 * tokens, SQLSTATE). This module re-exports it and adds the few app-level
 * ergonomics consumers rely on (retryability, a retry wrapper, a friendly
 * constraint-message overlay, and small factory/accessor helpers).
 */
import {
	ConstructiveError,
	classify,
	errors,
	format,
	isPublicCode,
	parse,
	toError,
} from '@constructive-io/errors';

export {
	ConstructiveError,
	classify,
	errors,
	format,
	isPublicCode,
	parse,
	toError,
};

export type { ErrorClass, ErrorContext, ParsedError } from '@constructive-io/errors';

type SetTimeoutFn = (handler: () => void, timeout?: number) => unknown;

function wait(ms: number): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	const scheduler = (globalThis as { setTimeout?: SetTimeoutFn }).setTimeout;
	if (typeof scheduler !== 'function') return Promise.resolve();
	return new Promise<void>((resolve) => {
		scheduler(resolve, ms);
	});
}

// ============================================================================
// Accessors
// ============================================================================

/** The canonical machine code for any error (`null` when none can be determined). */
export function getErrorCode(error: unknown): string | null {
	return parse(error).code;
}

/**
 * Server codes that mean the session or its token was rejected. The one list every
 * transport and `isAuthenticationError` use, so they cannot disagree.
 */
export const AUTHENTICATION_ERROR_CODES: readonly string[] = ['UNAUTHENTICATED', 'BAD_TOKEN_DEFINITION'];

/** Whether a machine code (never a message) means the session or its token was rejected. */
export function isAuthenticationCode(code: unknown): boolean {
	return typeof code === 'string' && AUTHENTICATION_ERROR_CODES.includes(code);
}

const AUTH_STATUS = 401;

type Shape = Record<string, unknown>;

function asShape(value: unknown): Shape | null {
	return value && typeof value === 'object' ? (value as Shape) : null;
}

function hasAuthCode(node: unknown): boolean {
	return isAuthenticationCode(asShape(asShape(node)?.extensions)?.code);
}

function hasAuthCodeIn(errors: unknown): boolean {
	return Array.isArray(errors) && errors.some(hasAuthCode);
}

/**
 * Whether an error means the session ended: an HTTP 401, or a GraphQL error whose
 * `extensions.code` is one of {@link AUTHENTICATION_ERROR_CODES} (on the error
 * itself, or on any error of its response, as `errors` or `response.errors`). The
 * message text is never read, so a permission error whose text mentions
 * "unauthorized" does not sign anyone out. A `ConstructiveError` counts by its code:
 * the transports create `UNAUTHENTICATED` only for a 401 or one of those codes.
 */
export function isAuthenticationError(error: unknown): boolean {
	if (error instanceof ConstructiveError) return isAuthenticationCode(error.code);
	const shape = asShape(error);
	if (!shape) return false;
	const response = asShape(shape.response);
	if (shape.status === AUTH_STATUS || shape.statusCode === AUTH_STATUS || response?.status === AUTH_STATUS) return true;
	return hasAuthCode(shape) || hasAuthCodeIn(shape.errors) || hasAuthCodeIn(response?.errors);
}

// ============================================================================
// Retryability
// ============================================================================

const RETRYABLE_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMITED', 'TOO_MANY_REQUESTS']);

/** Whether an error is safe to retry (transient network/timeout/rate-limit). */
export function isRetryable(error: unknown): boolean {
	const { code } = parse(error);
	return Boolean(code && RETRYABLE_CODES.has(code));
}

/** Run `fn`, retrying only retryable failures. Rejects with a {@link ConstructiveError}. */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T> {
	let attempt = 0;

	while (true) {
		try {
			return await fn();
		} catch (error) {
			const normalized = toError(error);
			attempt += 1;

			if (!isRetryable(normalized) || attempt >= maxRetries) {
				throw normalized;
			}

			if (delayMs > 0) {
				await wait(delayMs);
			}
		}
	}
}

// ============================================================================
// Error factory
// ============================================================================

/** Construct canonical {@link ConstructiveError}s for common transport failures. */
export const createError = {
	network: (originalError?: Error) => errors.NETWORK_ERROR({}, originalError?.message),
	timeout: () => errors.TIMEOUT_ERROR(),
	unauthorized: (message = 'Authentication required') => errors.UNAUTHENTICATED({}, message),
	forbidden: (message = 'Access forbidden') => errors.FORBIDDEN({}, message),
	notFound: (message = 'Resource not found') => errors.NOT_FOUND({}, message),
	badRequest: (message: string) => errors.BAD_USER_INPUT({}, message),
	graphql: (message: string, code?: string) =>
		toError(code ? { message, extensions: { code } } : { message }),
	unknown: (originalError: Error) => toError(originalError),
};

// ============================================================================
// Constraint message overlay (app-specific, friendly copy)
// ============================================================================

/**
 * Constraint-specific human-friendly messages.
 *
 * Keys can be an exact constraint name (`database_schema_hash_key`) or a
 * suffix pattern with a `*` prefix (`*_email_key`). This is app-specific UX
 * copy keyed by database constraint name; it overlays the canonical registry
 * message for constraint violations.
 */
export const CONSTRAINT_MESSAGES: Record<string, string> = {
	// Database provisioning
	database_schema_hash_key: 'This database name is already taken. Please choose a different name.',
	database_name_key: 'This database name is already taken. Please choose a different name.',
	database_provision_module_name_length_min: 'Database name must be at least 3 characters.',
	database_provision_module_name_length_max: 'Database name must be 63 characters or less.',
	database_provision_module_name_format:
		'Database name must start with a letter and use only letters, numbers, underscores, or hyphens.',

	// Domain constraints
	domain_subdomain_domain_key: 'This subdomain is already in use for this domain.',

	// API constraints
	api_name_database_id_key: 'An API with this name already exists in this database.',

	// Generic suffix patterns (checked after exact matches)
	'*_email_key': 'This email address is already registered.',
	'*_name_key': 'This name is already taken.',
	'*_slug_key': 'This URL slug is already in use.',
};

/** Friendly message for a constraint violation — exact match first, then `*` suffix patterns. */
export function getConstraintMessage(constraint: string | null | undefined): string | undefined {
	if (!constraint) return undefined;

	if (CONSTRAINT_MESSAGES[constraint]) {
		return CONSTRAINT_MESSAGES[constraint];
	}

	for (const [pattern, message] of Object.entries(CONSTRAINT_MESSAGES)) {
		if (pattern.startsWith('*') && constraint.endsWith(pattern.slice(1))) {
			return message;
		}
	}

	return undefined;
}

// ============================================================================
// Parsing / display
// ============================================================================

/** Normalize any error into a canonical {@link ConstructiveError}. */
export function parseError(error: unknown, locale?: string): ConstructiveError {
	return toError(error, locale);
}

/** Alias of {@link parseError} for GraphQL-shaped inputs. */
export function parseGraphQLError(error: unknown, locale?: string): ConstructiveError {
	return toError(error, locale);
}

/**
 * A user-facing message for any error. Prefers the friendly constraint overlay
 * when the error carries a `constraint`, otherwise the canonical (localized)
 * message.
 */
export function getHumanReadableError(error: unknown, locale?: string): string {
	const normalized = toError(error, locale);
	const constraint = typeof normalized.context?.constraint === 'string' ? normalized.context.constraint : undefined;
	return getConstraintMessage(constraint) ?? normalized.message;
}
