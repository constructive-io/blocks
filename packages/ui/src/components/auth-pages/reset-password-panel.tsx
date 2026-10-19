'use client';

import * as React from 'react';
import { CircleCheckIcon, LockKeyholeIcon } from 'lucide-react';

import { Field, FieldGroup } from '../field';
import { AuthCard, AuthFailure, AuthLinkButton, AuthSubmit, BackToSignIn } from './auth-card';
import { PasswordInput } from './password-input';
import type { ResetPasswordPanelProps } from './types';
import { passwordError, passwordMinLength, useAuthForm } from './use-auth-form';

const FIELDS = ['password', 'confirm'] as const;

function confirmError(password: string, confirm: string): string | undefined {
	if (!confirm) return 'Enter the new password again.';
	if (confirm !== password) return 'The passwords do not match.';
	return undefined;
}

/** Sets a new password from a reset link: the password twice, then a way to sign in. */
export function ResetPasswordPanel({
	onSubmit,
	links,
	passwordMinLength: minLengthProp,
	title = 'Choose a new password',
	description = 'Set a new password to finish recovering your account.',
	notice,
	linkComponent,
	className,
}: ResetPasswordPanelProps) {
	const [password, setPassword] = React.useState('');
	const [confirm, setConfirm] = React.useState('');
	const [done, setDone] = React.useState(false);
	const form = useAuthForm(FIELDS);
	const minLength = passwordMinLength(minLengthProp);
	const hint = minLength > 1 ? `Use at least ${minLength} characters.` : undefined;

	if (done) {
		return (
			<AuthCard
				className={className}
				description="Your password has been reset. You can sign in with it now."
				focusTitle
				icon={CircleCheckIcon}
				title="Password updated"
				tone="success"
			>
				{links?.signIn ? (
					<AuthLinkButton href={links.signIn} linkComponent={linkComponent}>
						Sign in
					</AuthLinkButton>
				) : null}
			</AuthCard>
		);
	}

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
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
			footer={links?.signIn ? <BackToSignIn href={links.signIn} linkComponent={linkComponent} /> : null}
			icon={LockKeyholeIcon}
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
							onChange={(event) => {
								setPassword(event.currentTarget.value);
								form.clearError('password');
							}}
							required
							value={password}
						/>
					</Field>
					<Field label="Confirm new password" required {...form.field('confirm')}>
						<PasswordInput
							{...form.input('confirm')}
							autoComplete="new-password"
							name="confirm-password"
							onChange={(event) => {
								setConfirm(event.currentTarget.value);
								form.clearError('confirm');
							}}
							required
							value={confirm}
						/>
					</Field>
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit label="Reset password" pending={form.pending} pendingLabel="Resetting password…" />
			</form>
		</AuthCard>
	);
}
