import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AuthLayout,
	type AuthLinkComponent,
	type AuthResult,
	ResetPasswordPanel,
	SignInPanel,
	SignUpPanel,
	VerifyEmailPanel,
} from '../src/components/auth-pages';

// Flow tests render whole screens; a cold transform on a loaded machine can pass the 5s default.
vi.setConfig({ testTimeout: 30_000 });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function render(element: React.ReactElement) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
}

const text = (element: Element | null | undefined) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** The input a visible label names (the required star is not part of the name). */
function field(label: string) {
	const element = [...container!.querySelectorAll('label')].find((candidate) => text(candidate).replace(/\*$/, '') === label);
	const control = element?.htmlFor ? document.getElementById(element.htmlFor) : null;
	if (!(control instanceof HTMLInputElement)) throw new Error(`No input labelled ${label}`);
	return control;
}

function button(name: string) {
	const match = [...container!.querySelectorAll('button')].find((candidate) => (candidate.getAttribute('aria-label') ?? text(candidate)) === name);
	if (!match) throw new Error(`No button named ${name}`);
	return match;
}

function link(name: string) {
	const match = [...container!.querySelectorAll('a')].find((candidate) => text(candidate) === name);
	if (!match) throw new Error(`No link named ${name}`);
	return match;
}

/** Alerts the panel raised for a handler answer (field errors are alerts too, so they are left out). */
const alerts = () => [...container!.querySelectorAll('[data-slot="alert"][role="alert"]')].map(text);
const heading = () => text(container!.querySelector('h1'));

async function type(input: HTMLInputElement, value: string) {
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

function deferred() {
	let resolve!: (result: AuthResult) => void;
	const promise = new Promise<AuthResult>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('Auth pages', () => {
	it('checks the email before signing in, then sends the trimmed email, the password, and the remember-me choice', async () => {
		const onSubmit = vi.fn((_values: { email: string; password: string; rememberMe: boolean }): AuthResult => ({ ok: true }));
		await render(<SignInPanel onSubmit={onSubmit} />);

		await click(button('Sign in'));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(field('Email address').getAttribute('aria-invalid')).toBe('true');
		expect(document.activeElement).toBe(field('Email address'));

		await type(field('Email address'), 'ada.example.com');
		await type(field('Password'), 'correct horse');
		await click(button('Sign in'));
		expect(onSubmit).not.toHaveBeenCalled();
		const describedBy = field('Email address').getAttribute('aria-describedby');
		expect(text(document.getElementById(describedBy!))).toMatch(/valid email/i);

		await type(field('Email address'), '  ada@example.com  ');
		await click(container!.querySelector<HTMLElement>('[role="checkbox"]')!);
		await click(button('Sign in'));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse', rememberMe: true });
	});

	it('shows a refused sign-in in an alert, holds the button while pending, and never shows a thrown error', async () => {
		const first = deferred();
		const onSubmit = vi
			.fn<(values: { email: string; password: string; rememberMe: boolean }) => Promise<AuthResult>>()
			.mockReturnValueOnce(first.promise)
			.mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.12:5432'));
		await render(<SignInPanel defaultEmail='ada@example.com' onSubmit={onSubmit} />);

		await type(field('Password'), 'wrong-password');
		await click(button('Sign in'));
		const pending = button('Signing in…');
		expect(pending.disabled).toBe(true);
		expect(pending.getAttribute('aria-busy')).toBe('true');
		await act(async () => container!.querySelector('form')!.requestSubmit());
		expect(onSubmit).toHaveBeenCalledTimes(1);

		await act(async () => first.resolve({ ok: false, message: 'That email and password do not match.' }));
		expect(alerts()).toEqual(['That email and password do not match.']);
		expect(button('Sign in').disabled).toBe(false);

		await click(button('Sign in'));
		expect(alerts()).toEqual(['Something went wrong. Try again.']);
		expect(container!.textContent).not.toContain('ECONNREFUSED');
	});

	it('swaps a successful sign-up to the check-email state, with links from the layout', async () => {
		const onSubmit = vi.fn(async (_values: { email: string; password: string }): Promise<AuthResult> => ({ ok: true }));
		const HostLink: AuthLinkComponent = ({ href, className, children }) => (
			<a className={className} data-host-link='' href={href}>
				{children}
			</a>
		);
		await render(
			<AuthLayout linkComponent={HostLink}>
				<SignUpPanel links={{ signIn: '/sign-in' }} onSubmit={onSubmit} />
			</AuthLayout>,
		);

		await type(field('Email address'), ' grace@example.com ');
		await type(field('Password'), 'analytical engine');
		await click(button('Create account'));

		expect(onSubmit).toHaveBeenCalledWith({ email: 'grace@example.com', password: 'analytical engine' });
		expect(heading()).toBe('Check your email');
		expect(text(container)).toContain('We sent a confirmation link to grace@example.com.');
		expect(container!.querySelector('input[type="password"]')).toBeNull();
		const back = link('Back to sign in');
		expect(back.getAttribute('href')).toBe('/sign-in');
		expect(back.hasAttribute('data-host-link')).toBe(true);
	});

	it('blocks a reset when the new password is too short or the two entries differ', async () => {
		const onSubmit = vi.fn((_values: { password: string }): AuthResult => ({ ok: true }));
		await render(<ResetPasswordPanel links={{ signIn: '/sign-in' }} onSubmit={onSubmit} passwordMinLength={10} />);

		await type(field('New password'), 'short');
		await type(field('Confirm new password'), 'short');
		await click(button('Reset password'));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(field('New password').getAttribute('aria-invalid')).toBe('true');
		expect(document.activeElement).toBe(field('New password'));

		await type(field('New password'), 'long enough phrase');
		await type(field('Confirm new password'), 'long enough phrasE');
		await click(button('Reset password'));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(field('New password').getAttribute('aria-invalid')).toBeNull();
		expect(field('Confirm new password').getAttribute('aria-invalid')).toBe('true');

		await type(field('Confirm new password'), 'long enough phrase');
		await click(button('Reset password'));
		expect(onSubmit).toHaveBeenCalledWith({ password: 'long enough phrase' });
		expect(heading()).toBe('Password updated');
		expect(link('Sign in').getAttribute('href')).toBe('/sign-in');
	});

	it('verifies once under StrictMode, and "Try again" calls the handler again', async () => {
		const onVerify = vi
			.fn<() => Promise<AuthResult>>()
			.mockResolvedValueOnce({ ok: false, message: 'This link has expired. Request a new one.' })
			.mockResolvedValueOnce({ ok: true });
		await render(
			<React.StrictMode>
				<VerifyEmailPanel links={{ continue: '/app', signIn: '/sign-in' }} onVerify={onVerify} />
			</React.StrictMode>,
		);

		expect(onVerify).toHaveBeenCalledTimes(1);
		expect(alerts()).toEqual(['This link has expired. Request a new one.']);

		await click(button('Try again'));
		expect(onVerify).toHaveBeenCalledTimes(2);
		expect(heading()).toBe('Email verified');
		expect(link('Continue').getAttribute('href')).toBe('/app');
	});
});
