'use client';

import * as React from 'react';
import { CircleCheckIcon, MailWarningIcon, RotateCcwIcon } from 'lucide-react';

import { AuthCard, AuthFailure, AuthLinkButton, AuthSubmit, BackToSignIn } from './auth-card';
import type { VerifyEmailPanelProps } from './types';
import { useAuthForm } from './use-auth-form';

const NO_FIELDS = [] as const;

/**
 * Confirms an email address from a verification link. It calls `onVerify` once
 * on mount (StrictMode's second effect run does not call it again), then shows
 * the result: a link onward, or the failure with "Try again".
 */
export function VerifyEmailPanel({
	onVerify,
	links,
	title = 'Verifying your email',
	description = 'This takes a moment. Keep this page open.',
	notice,
	linkComponent,
	className,
}: VerifyEmailPanelProps) {
	const form = useAuthForm(NO_FIELDS);
	const [verified, setVerified] = React.useState(false);
	const started = React.useRef(false);
	const latestVerify = React.useRef(onVerify);
	latestVerify.current = onVerify;
	const latestSubmit = React.useRef(form.submit);
	latestSubmit.current = form.submit;

	const verify = React.useCallback(() => {
		void latestSubmit.current({ run: () => latestVerify.current(), onSuccess: () => setVerified(true) });
	}, []);

	React.useEffect(() => {
		if (started.current) return;
		started.current = true;
		verify();
	}, [verify]);

	const footer = links?.signIn ? <BackToSignIn href={links.signIn} linkComponent={linkComponent} /> : null;
	const onward = links?.continue ?? links?.signIn;

	// Each state is its own card (`key`), so the result heading takes focus and is announced when it replaces the spinner.
	if (verified) {
		return (
			<AuthCard
				className={className}
				description={links?.continue ? 'Your email address is confirmed.' : 'Your email address is confirmed. You can sign in now.'}
				focusTitle
				icon={CircleCheckIcon}
				key="verified"
				notice={notice}
				title="Email verified"
				tone="success"
			>
				{onward ? (
					<AuthLinkButton href={onward} linkComponent={linkComponent}>
						{links?.continue ? 'Continue' : 'Sign in'}
					</AuthLinkButton>
				) : null}
			</AuthCard>
		);
	}

	if (form.failure) {
		return (
			<AuthCard
				className={className}
				description="The link may have expired or already been used."
				focusTitle
				footer={footer}
				icon={MailWarningIcon}
				key="failed"
				notice={notice}
				title="We could not verify your email"
				tone="destructive"
			>
				<AuthFailure message={form.failure} />
				<AuthSubmit
					label={
						<>
							<RotateCcwIcon aria-hidden="true" />
							Try again
						</>
					}
					onClick={verify}
					pending={form.pending}
					pendingLabel="Verifying…"
					type="button"
				/>
			</AuthCard>
		);
	}

	return (
		<AuthCard className={className} description={description} footer={footer} icon="spinner" key="verifying" notice={notice} title={title} />
	);
}
