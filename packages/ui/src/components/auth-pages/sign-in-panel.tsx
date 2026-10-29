'use client';

import * as React from 'react';
import { KeyRoundIcon } from 'lucide-react';

import { Checkbox } from '../checkbox';
import { Field, FieldGroup, FieldLabel } from '../field';
import { AuthCard, AuthFailure, AuthLink, AuthSubmit, footerTextClass, mutedLinkClass, primaryLinkClass } from './auth-card';
import { EmailInput, PasswordInput } from './password-input';
import type { SignInPanelProps } from './types';
import { emailError, passwordError, useAuthForm } from './use-auth-form';

/** Email and password sign-in with a remember-me choice. The host navigates on `{ ok: true }`. */
export function SignInPanel({
	onSubmit,
	links,
	defaultEmail = '',
	title = 'Sign in',
	description = 'Use your account to continue to this application.',
	notice,
	linkComponent,
	className,
}: SignInPanelProps) {
	const [rememberMe, setRememberMe] = React.useState(false);
	// After `{ ok: true }` the host is navigating away; keep the button down so a second click cannot sign in twice.
	const [signedIn, setSignedIn] = React.useState(false);
	const form = useAuthForm({ email: defaultEmail, password: '' });
	const rememberId = React.useId();

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { email, password } = form.values;
		const trimmed = email.trim();
		void form.submit({
			validate: () => ({ email: emailError(trimmed), password: passwordError(password) }),
			run: () => onSubmit({ email: trimmed, password, rememberMe }),
			onSuccess: () => setSignedIn(true),
			focusOnFailure: 'password',
		});
	};

	const footer =
		links?.forgotPassword || links?.signUp ? (
			<>
				{links.forgotPassword ? (
					<AuthLink className={mutedLinkClass} href={links.forgotPassword}>
						Forgot password?
					</AuthLink>
				) : (
					<span />
				)}
				{links.signUp ? (
					<span className={footerTextClass}>
						New here?{' '}
						<AuthLink className={primaryLinkClass} href={links.signUp}>
							Create account
						</AuthLink>
					</span>
				) : null}
			</>
		) : null;

	return (
		<AuthCard
			className={className}
			description={description}
			footer={footer}
			icon={KeyRoundIcon}
			linkComponent={linkComponent}
			notice={notice}
			title={title}
		>
			<form className="flex min-w-0 flex-col gap-4" noValidate onSubmit={submit}>
				<FieldGroup>
					<Field label="Email address" required {...form.field('email')}>
						<EmailInput {...form.input('email')} name="email" required />
					</Field>
					<Field label="Password" required {...form.field('password')}>
						<PasswordInput
							{...form.input('password')}
							autoComplete="current-password"
							name="password"
							required
						/>
					</Field>
					<Field orientation="horizontal">
						<Checkbox
							checked={rememberMe}
							id={rememberId}
							name="remember-me"
							onCheckedChange={(checked) => setRememberMe(checked === true)}
						/>
						<FieldLabel htmlFor={rememberId}>Keep me signed in on this device</FieldLabel>
					</Field>
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit
					disabled={signedIn}
					label={signedIn ? 'Signed in' : 'Sign in'}
					pending={form.pending}
					pendingLabel="Signing in…"
				/>
			</form>
		</AuthCard>
	);
}
