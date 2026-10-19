'use client';

import * as React from 'react';
import { KeyRoundIcon } from 'lucide-react';

import { Checkbox } from '../checkbox';
import { Field, FieldGroup, FieldLabel } from '../field';
import { AuthCard, AuthFailure, AuthLink, AuthSubmit, footerTextClass, mutedLinkClass, primaryLinkClass } from './auth-card';
import { EmailInput, PasswordInput } from './password-input';
import type { SignInPanelProps } from './types';
import { emailError, passwordError, useAuthForm } from './use-auth-form';

const FIELDS = ['email', 'password'] as const;

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
	const [email, setEmail] = React.useState(defaultEmail);
	const [password, setPassword] = React.useState('');
	const [rememberMe, setRememberMe] = React.useState(false);
	// After `{ ok: true }` the host is navigating away; keep the button down so a second click cannot sign in twice.
	const [signedIn, setSignedIn] = React.useState(false);
	const form = useAuthForm(FIELDS);
	const rememberId = React.useId();

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
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
					<AuthLink className={mutedLinkClass} href={links.forgotPassword} linkComponent={linkComponent}>
						Forgot password?
					</AuthLink>
				) : (
					<span />
				)}
				{links.signUp ? (
					<span className={footerTextClass}>
						New here?{' '}
						<AuthLink className={primaryLinkClass} href={links.signUp} linkComponent={linkComponent}>
							Create account
						</AuthLink>
					</span>
				) : null}
			</>
		) : null;

	return (
		<AuthCard className={className} description={description} footer={footer} icon={KeyRoundIcon} notice={notice} title={title}>
			<form className="flex min-w-0 flex-col gap-4" noValidate onSubmit={submit}>
				<FieldGroup>
					<Field label="Email address" required {...form.field('email')}>
						<EmailInput
							{...form.input('email')}
							name="email"
							onChange={(event) => {
								setEmail(event.currentTarget.value);
								form.clearError('email');
							}}
							required
							value={email}
						/>
					</Field>
					<Field label="Password" required {...form.field('password')}>
						<PasswordInput
							{...form.input('password')}
							autoComplete="current-password"
							name="password"
							onChange={(event) => {
								setPassword(event.currentTarget.value);
								form.clearError('password');
							}}
							required
							value={password}
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
