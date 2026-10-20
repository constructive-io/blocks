'use client';

import * as React from 'react';
import { MailCheckIcon } from 'lucide-react';

import { Alert, AlertDescription } from '../alert';
import { AuthCard, AuthFailure, AuthSubmit, BackToSignIn, EmailAddress } from './auth-card';
import type { CheckEmailPanelProps } from './types';
import { useAuthForm } from './use-auth-form';

function checkEmailDescription(email?: string): React.ReactNode {
	if (!email) return 'We sent you a confirmation link. Open it to confirm your address, then sign in with your password.';
	return (
		<>
			We sent a confirmation link to <EmailAddress email={email} />. Open it to confirm your address, then sign in with your
			password.
		</>
	);
}

/**
 * Tells a new account to confirm its address, then sign in with its password.
 * Sign-up renders it in place after `{ ok: true }` with `focusTitle`, so the
 * new heading is announced where the form was.
 */
export function CheckEmailPanel({
	email,
	onResend,
	links,
	title = 'Check your email',
	description,
	notice,
	linkComponent,
	className,
	focusTitle = false,
}: CheckEmailPanelProps & { focusTitle?: boolean }) {
	const form = useAuthForm({});
	const [resent, setResent] = React.useState(false);
	const trimmed = email?.trim() || undefined;

	return (
		<AuthCard
			className={className}
			description={description ?? checkEmailDescription(trimmed)}
			focusTitle={focusTitle}
			footer={links?.signIn ? <BackToSignIn href={links.signIn} /> : null}
			icon={MailCheckIcon}
			linkComponent={linkComponent}
			notice={notice}
			title={title}
		>
			<p className="text-muted-foreground text-pretty text-[13px] [overflow-wrap:anywhere]">
				The link can take a minute to arrive. If you do not see it, check your spam folder
				{onResend ? ' or send it again.' : '.'}
			</p>
			{resent ? (
				<Alert role="status" variant="success">
					<AlertDescription>
						{trimmed ? (
							<>
								We sent a new link to <EmailAddress email={trimmed} />.
							</>
						) : (
							'We sent a new link.'
						)}
					</AlertDescription>
				</Alert>
			) : null}
			<AuthFailure message={form.failure} />
			{onResend ? (
				<AuthSubmit
					label="Resend email"
					onClick={() => {
						setResent(false);
						void form.submit({ run: onResend, onSuccess: () => setResent(true) });
					}}
					pending={form.pending}
					pendingLabel="Sending…"
					type="button"
					variant="outline"
				/>
			) : null}
		</AuthCard>
	);
}
