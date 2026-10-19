'use client';

import * as React from 'react';

import type { AuthHandlerResult, AuthResult } from './types';

/** Shown for a handler that throws or answers with something that is not an `AuthResult`. */
export const AUTH_GENERIC_ERROR = 'Something went wrong. Try again.';

export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

// A shape check only: it catches a missing @ or a stray space, and leaves the
// real decision to the server, so `name@localhost` still gets through.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

export type AuthFieldErrors<K extends string> = Partial<Record<K, string>>;

export function emailError(email: string): string | undefined {
	if (!email) return 'Enter an email address.';
	if (!EMAIL_SHAPE.test(email)) return 'Enter a valid email address, like name@example.com.';
	return undefined;
}

export function passwordError(password: string, minLength = 1): string | undefined {
	if (!password) return 'Enter a password.';
	if (password.length < minLength) return `Password must be at least ${minLength} characters.`;
	return undefined;
}

export function passwordMinLength(value: number | undefined): number {
	if (value === undefined || !Number.isFinite(value)) return DEFAULT_PASSWORD_MIN_LENGTH;
	return Math.max(1, Math.floor(value));
}

function failureMessage(result: unknown): string | undefined {
	if (!result || typeof result !== 'object') return AUTH_GENERIC_ERROR;
	const { ok, message } = result as Partial<{ ok: boolean; message: unknown }>;
	if (ok === true) return undefined;
	return ok === false && typeof message === 'string' && message.trim() ? message : AUTH_GENERIC_ERROR;
}

type SubmitOptions<K extends string> = {
	/** Field errors to show; the handler only runs when this returns none. */
	validate?: () => AuthFieldErrors<K>;
	run: () => AuthHandlerResult;
	/** Runs on `{ ok: true }`, only while the panel is still mounted. */
	onSuccess?: () => void;
	/** The field that takes focus when the handler fails, so the alert is read next to it. */
	focusOnFailure?: K;
};

/**
 * Submit, validation, and pending state shared by every auth panel: field
 * errors wired to `aria-invalid`/`aria-describedby` with focus on the first
 * invalid field, one call at a time, and a failure message for the alert.
 */
export function useAuthForm<K extends string>(fields: readonly K[]) {
	const baseId = React.useId();
	const [errors, setErrors] = React.useState<AuthFieldErrors<K>>({});
	const [pending, setPending] = React.useState(false);
	const [failure, setFailure] = React.useState<string>();
	const inputs = React.useRef<Partial<Record<K, HTMLInputElement | null>>>({});
	const running = React.useRef(false);
	const mounted = React.useRef(false);

	React.useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const ids = (name: K) => ({
		input: `${baseId}-${name}`,
		error: `${baseId}-${name}-error`,
		description: `${baseId}-${name}-description`,
	});

	/** Props for the `Field` around an input. */
	const field = (name: K, description?: string) => ({
		htmlFor: ids(name).input,
		error: errors[name],
		errorId: ids(name).error,
		description,
		descriptionId: description ? ids(name).description : undefined,
	});

	/** Props for the input itself. Pass `described` when its `Field` has a description. */
	const input = (name: K, described = false) => {
		const describedBy = [described && ids(name).description, errors[name] && ids(name).error].filter(Boolean).join(' ');
		return {
			id: ids(name).input,
			ref: (node: HTMLInputElement | null) => {
				inputs.current[name] = node;
			},
			'aria-invalid': errors[name] ? true : undefined,
			'aria-describedby': describedBy || undefined,
		};
	};

	const clearError = (name: K) => setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));

	const submit = async ({ validate, run, onSuccess, focusOnFailure }: SubmitOptions<K>) => {
		if (running.current) return;
		const next: AuthFieldErrors<K> = validate?.() ?? {};
		setErrors(next);
		setFailure(undefined);
		const firstInvalid = fields.find((name) => next[name]);
		if (firstInvalid) {
			inputs.current[firstInvalid]?.focus();
			return;
		}

		running.current = true;
		setPending(true);
		let result: AuthResult | undefined;
		try {
			result = await run();
		} catch {
			result = undefined;
		}
		running.current = false;
		if (!mounted.current) return;
		setPending(false);
		const message = failureMessage(result);
		if (message === undefined) {
			onSuccess?.();
			return;
		}
		setFailure(message);
		if (focusOnFailure) inputs.current[focusOnFailure]?.focus();
	};

	const reset = () => {
		setErrors({});
		setFailure(undefined);
	};

	return { pending, failure, field, input, clearError, submit, reset };
}
