'use client';

import * as React from 'react';
import { UserRoundPlusIcon } from 'lucide-react';

import { Field, FieldGroup } from '../field';
import { AuthCard, AuthFailure, AuthLink, AuthSubmit, footerTextClass, primaryLinkClass } from './auth-card';
import { CheckEmailPanel } from './check-email-panel';
import { EmailInput, PasswordInput } from './password-input';
import type { SignUpPanelProps } from './types';
import { emailError, passwordError, passwordRule, useAuthForm } from './use-auth-form';

/**
 * Email and password sign-up. It never expects a session: on `{ ok: true }` it
 * shows the check-email state for the address in place of the form.
 */
export function SignUpPanel({
	onSubmit,
	links,
	passwordMinLength,
	title = 'Create an account',
	description = 'Sign up with your email address and a password.',
	notice,
	linkComponent,
	className,
}: SignUpPanelProps) {
	const [sentTo, setSentTo] = React.useState<string>();
	const form = useAuthForm({ email: '', password: '' });
	const { minLength, hint } = passwordRule(passwordMinLength);

	if (sentTo !== undefined) {
		return <CheckEmailPanel className={className} email={sentTo} focusTitle linkComponent={linkComponent} links={links} />;
	}

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { email, password } = form.values;
		const trimmed = email.trim();
		void form.submit({
			validate: () => ({ email: emailError(trimmed), password: passwordError(password, minLength) }),
			run: () => onSubmit({ email: trimmed, password }),
			onSuccess: () => setSentTo(trimmed),
			focusOnFailure: 'email',
		});
	};

	const footer = links?.signIn ? (
		<span className={footerTextClass}>
			Already have an account?{' '}
			<AuthLink className={primaryLinkClass} href={links.signIn}>
				Sign in
			</AuthLink>
		</span>
	) : null;

	return (
		<AuthCard
			className={className}
			description={description}
			footer={footer}
			icon={UserRoundPlusIcon}
			linkComponent={linkComponent}
			notice={notice}
			title={title}
		>
			<form className="flex min-w-0 flex-col gap-4" noValidate onSubmit={submit}>
				<FieldGroup>
					<Field label="Email address" required {...form.field('email')}>
						<EmailInput {...form.input('email')} name="email" required />
					</Field>
					<Field label="Password" required {...form.field('password', hint)}>
						<PasswordInput
							{...form.input('password', Boolean(hint))}
							autoComplete="new-password"
							minLength={minLength}
							name="password"
							required
						/>
					</Field>
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit label="Create account" pending={form.pending} pendingLabel="Creating account…" />
			</form>
		</AuthCard>
	);
}
