'use client';

import * as React from 'react';
import { CircleCheckIcon, LockKeyholeIcon } from 'lucide-react';

import { Field, FieldGroup } from '../field';
import { AuthCard, AuthFailure, AuthLinkButton, AuthSubmit, BackToSignIn } from './auth-card';
import { PasswordInput } from './password-input';
import type { ResetPasswordPanelProps } from './types';
import { passwordError, passwordRule, useAuthForm } from './use-auth-form';

function confirmError(password: string, confirm: string): string | undefined {
	if (!confirm) return 'Enter the new password again.';
	if (confirm !== password) return 'The passwords do not match.';
	return undefined;
}

/** Sets a new password from a reset link: the password twice, then a way to sign in. */
export function ResetPasswordPanel({
	onSubmit,
	links,
	passwordMinLength,
	title = 'Choose a new password',
	description = 'Set a new password to finish recovering your account.',
	notice,
	linkComponent,
	className,
}: ResetPasswordPanelProps) {
	const [done, setDone] = React.useState(false);
	const form = useAuthForm({ password: '', confirm: '' });
	const { minLength, hint } = passwordRule(passwordMinLength);

	if (done) {
		return (
			<AuthCard
				className={className}
				description="Your password has been reset. You can sign in with it now."
				focusTitle
				icon={CircleCheckIcon}
				linkComponent={linkComponent}
				title="Password updated"
				tone="success"
			>
				{links?.signIn ? (
					<AuthLinkButton href={links.signIn}>
						Sign in
					</AuthLinkButton>
				) : null}
			</AuthCard>
		);
	}

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { password, confirm } = form.values;
		void form.submit({
			validate: () => ({ password: passwordError(password, minLength), confirm: confirmError(password, confirm) }),
			run: () => onSubmit({ password }),
			onSuccess: () => setDone(true),
			focusOnFailure: 'password',
		});
	};

	return (
		<AuthCard
			className={className}
			description={description}
			footer={links?.signIn ? <BackToSignIn href={links.signIn} /> : null}
			icon={LockKeyholeIcon}
			linkComponent={linkComponent}
			notice={notice}
			title={title}
		>
			<form className="flex min-w-0 flex-col gap-4" noValidate onSubmit={submit}>
				<FieldGroup>
					<Field label="New password" required {...form.field('password', hint)}>
						<PasswordInput
							{...form.input('password', Boolean(hint))}
							autoComplete="new-password"
							minLength={minLength}
							name="new-password"
							required
						/>
					</Field>
					<Field label="Confirm new password" required {...form.field('confirm')}>
						<PasswordInput
							{...form.input('confirm')}
							autoComplete="new-password"
							name="confirm-password"
							required
						/>
					</Field>
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit label="Reset password" pending={form.pending} pendingLabel="Resetting password…" />
			</form>
		</AuthCard>
	);
}
