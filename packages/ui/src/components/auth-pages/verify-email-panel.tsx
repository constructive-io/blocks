'use client';

import * as React from 'react';
import { CircleCheckIcon, MailCheckIcon } from 'lucide-react';

import { Field, FieldGroup } from '../field';
import { AuthCard, AuthFailure, AuthLinkButton, AuthSubmit, BackToSignIn } from './auth-card';
import { PasswordInput } from './password-input';
import type { VerifyEmailPanelProps } from './types';
import { passwordError, useAuthForm } from './use-auth-form';

/**
 * Confirms an email address from a verification link. Opening the link spends
 * nothing: the person types the password they chose at sign-up, and only that
 * submit calls `onVerify`. The link proves the inbox and the password proves
 * the person who signed up, so a mail nobody asked for cannot switch on a
 * stranger's password. A refusal keeps the form for another try.
 */
export function VerifyEmailPanel({
	onVerify,
	links,
	title = 'Confirm your email',
	description = 'Enter the password you chose when you signed up, and your address is confirmed.',
	notice,
	linkComponent,
	className,
}: VerifyEmailPanelProps) {
	const [verified, setVerified] = React.useState(false);
	const form = useAuthForm({ password: '' });

	if (verified) {
		const onward = links?.continue ?? links?.signIn;
		return (
			<AuthCard
				className={className}
				description={links?.continue ? 'Your email address is confirmed.' : 'Your email address is confirmed. You can sign in now.'}
				focusTitle
				icon={CircleCheckIcon}
				linkComponent={linkComponent}
				notice={notice}
				title="Email verified"
				tone="success"
			>
				{onward ? (
					<AuthLinkButton href={onward}>
						{links?.continue ? 'Continue' : 'Sign in'}
					</AuthLinkButton>
				) : null}
			</AuthCard>
		);
	}

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { password } = form.values;
		void form.submit({
			validate: () => ({ password: passwordError(password) }),
			run: () => onVerify({ password }),
			onSuccess: () => setVerified(true),
			focusOnFailure: 'password',
		});
	};

	return (
		<AuthCard
			className={className}
			description={description}
			footer={links?.signIn ? <BackToSignIn href={links.signIn} /> : null}
			icon={MailCheckIcon}
			linkComponent={linkComponent}
			notice={notice}
			title={title}
		>
			<form className="flex min-w-0 flex-col gap-4" noValidate onSubmit={submit}>
				<FieldGroup>
					<Field label="Password" required {...form.field('password')}>
						<PasswordInput {...form.input('password')} autoComplete="current-password" name="password" required />
					</Field>
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit label="Confirm email" pending={form.pending} pendingLabel="Confirming email…" />
			</form>
		</AuthCard>
	);
}
