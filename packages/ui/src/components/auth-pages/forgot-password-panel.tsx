'use client';

import * as React from 'react';
import { MailCheckIcon, RotateCcwKeyIcon } from 'lucide-react';

import { Button } from '../button';
import { Field, FieldGroup } from '../field';
import { AuthCard, AuthFailure, AuthSubmit, BackToSignIn, EmailAddress } from './auth-card';
import { EmailInput } from './password-input';
import type { ForgotPasswordPanelProps } from './types';
import { emailError, useAuthForm } from './use-auth-form';

const FIELDS = ['email'] as const;

/**
 * Asks for a password reset link. On `{ ok: true }` it says a link is on its
 * way if an account exists, so the page never reveals which addresses have one.
 */
export function ForgotPasswordPanel({
	onSubmit,
	links,
	title = 'Reset your password',
	description = 'Enter the email address for your account and we will send you a link to choose a new password.',
	notice,
	linkComponent,
	className,
}: ForgotPasswordPanelProps) {
	const [email, setEmail] = React.useState('');
	const [sentTo, setSentTo] = React.useState<string>();
	const form = useAuthForm(FIELDS);
	const footer = links?.signIn ? <BackToSignIn href={links.signIn} linkComponent={linkComponent} /> : null;

	if (sentTo !== undefined) {
		return (
			<AuthCard
				className={className}
				description={
					<>
						If an account exists for <EmailAddress email={sentTo} />, a reset link is on its way.
					</>
				}
				focusTitle
				footer={footer}
				icon={MailCheckIcon}
				title="Check your email"
			>
				<p className="text-muted-foreground text-pretty text-[13px] [overflow-wrap:anywhere]">
					The link can take a minute to arrive. If you do not see it, check your spam folder.
				</p>
				<Button onClick={() => setSentTo(undefined)} type="button" variant="outline" wrap>
					Use a different email
				</Button>
			</AuthCard>
		);
	}

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = email.trim();
		void form.submit({
			validate: () => ({ email: emailError(trimmed) }),
			run: () => onSubmit({ email: trimmed }),
			onSuccess: () => setSentTo(trimmed),
			focusOnFailure: 'email',
		});
	};

	return (
		<AuthCard className={className} description={description} footer={footer} icon={RotateCcwKeyIcon} notice={notice} title={title}>
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
				</FieldGroup>
				<AuthFailure message={form.failure} />
				<AuthSubmit label="Send reset link" pending={form.pending} pendingLabel="Sending reset link…" />
			</form>
		</AuthCard>
	);
}
