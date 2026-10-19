import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useRef, useState } from 'react';
import type * as React from 'react';

import {
	AuthLayout,
	type AuthLinkComponent,
	type AuthResult,
	CheckEmailPanel,
	ForgotPasswordPanel,
	ResetPasswordPanel,
	SignInPanel,
	SignUpPanel,
	VerifyEmailPanel,
} from '../components/auth-pages';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const meta: Meta = {
	title: 'App Kit/Auth Pages',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Sign-in, sign-up, check-email, verify-email, forgot-password, and reset-password panels with a page layout. Each panel takes handlers that answer `{ ok: true }` or `{ ok: false, message }`; the host owns routing, sessions, and the backend. In these stories the password `wrong-password` and the email `taken@example.com` are refused.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const ok = async (): Promise<AuthResult> => {
	await wait(700);
	return { ok: true };
};

const signIn = async ({ password }: { password: string }): Promise<AuthResult> => {
	await wait(700);
	return password === 'wrong-password' ? { ok: false, message: 'That email and password do not match.' } : { ok: true };
};

const signUp = async ({ email }: { email: string }): Promise<AuthResult> => {
	await wait(700);
	return email === 'taken@example.com' ? { ok: false, message: 'An account with that email already exists. Sign in instead.' } : { ok: true };
};

function Logo() {
	return (
		<svg className='size-full bg-primary p-1.5 text-primary-foreground' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'>
			<path d='M4 18 12 5l8 13Z' strokeLinejoin='round' />
		</svg>
	);
}

/** Renders a panel in the layout, with a log line of what the host's links receive. */
function Frame({ children, width }: { children: React.ReactNode; width?: number }) {
	const [log, setLog] = useState('Links appear here when clicked.');
	// One component for the life of the story, so a log update does not remount every link.
	const StoryLink = useMemo<AuthLinkComponent>(
		() =>
			function StoryLink({ href, className, children: label }) {
				return (
					<a
						className={className}
						href={href}
						onClick={(event) => {
							event.preventDefault();
							setLog(`The host would navigate to ${href}.`);
						}}
					>
						{label}
					</a>
				);
			},
		[],
	);
	const page = (
		<AuthLayout
			brand={{ name: 'Acme', logo: <Logo />, href: '/' }}
			className={width ? 'min-h-full' : 'min-h-0 flex-1'}
			footer={
				<>
					By continuing you agree to the <a href='#terms'>Terms</a> and the <a href='#privacy'>Privacy Policy</a>.
				</>
			}
			linkComponent={StoryLink}
		>
			{children}
		</AuthLayout>
	);
	return (
		<div className='flex h-dvh min-h-[720px] flex-col'>
			{width ? (
				<div className='flex min-h-0 flex-1 justify-center overflow-auto bg-muted p-4'>
					<div className='h-fit min-h-full overflow-hidden rounded-xl border border-border shadow-sm' style={{ width }}>
						{page}
					</div>
				</div>
			) : (
				<div className='flex min-h-0 flex-1 flex-col overflow-auto'>{page}</div>
			)}
			<p aria-live='polite' className='shrink-0 truncate border-t border-border px-3 py-1.5 font-mono text-xs text-muted-foreground'>
				{log}
			</p>
		</div>
	);
}

export const SignIn: Story = {
	render: () => (
		<Frame>
			<SignInPanel links={{ forgotPassword: '/forgot-password', signUp: '/sign-up' }} onSubmit={signIn} />
		</Frame>
	),
};

export const SignUp: Story = {
	render: () => (
		<Frame>
			<SignUpPanel links={{ signIn: '/sign-in' }} onSubmit={signUp} />
		</Frame>
	),
};

export const CheckEmail: Story = {
	render: () => (
		<Frame>
			<CheckEmailPanel email='ada@example.com' links={{ signIn: '/sign-in' }} onResend={ok} />
		</Frame>
	),
};

export const VerifyEmail: Story = {
	render: () => (
		<Frame>
			<VerifyEmailPanel links={{ continue: '/app', signIn: '/sign-in' }} onVerify={ok} />
		</Frame>
	),
};

export const VerifyEmailFailed: Story = {
	name: 'Verify email: expired link',
	parameters: { docs: { description: { story: 'The first call fails; "Try again" calls `onVerify` again, and this time it succeeds.' } } },
	render: function VerifyEmailFailedStory() {
		const calls = useRef(0);
		return (
			<Frame>
				<VerifyEmailPanel
					links={{ continue: '/app', signIn: '/sign-in' }}
					onVerify={async () => {
						await wait(900);
						calls.current += 1;
						return calls.current === 1 ? { ok: false, message: 'This link has expired. Request a new one from the sign-in page.' } : { ok: true };
					}}
				/>
			</Frame>
		);
	},
};

export const ForgotPassword: Story = {
	render: () => (
		<Frame>
			<ForgotPasswordPanel links={{ signIn: '/sign-in' }} onSubmit={ok} />
		</Frame>
	),
};

export const ResetPassword: Story = {
	render: () => (
		<Frame>
			<ResetPasswordPanel links={{ signIn: '/sign-in' }} onSubmit={ok} />
		</Frame>
	),
};

export const WithNotice: Story = {
	name: 'Sign in with a notice',
	parameters: { docs: { description: { story: 'The host passes `notice` to explain why the person is here, for example after a session ends.' } } },
	render: () => (
		<Frame>
			<SignInPanel
				defaultEmail='ada@example.com'
				links={{ forgotPassword: '/forgot-password', signUp: '/sign-up' }}
				notice={{ tone: 'info', message: 'Your session ended. Sign in again to continue.' }}
				onSubmit={signIn}
			/>
		</Frame>
	),
};

export const NarrowPane: Story = {
	name: 'Sign up in a 700px pane',
	render: () => (
		<Frame width={700}>
			<SignUpPanel links={{ signIn: '/sign-in' }} onSubmit={signUp} />
		</Frame>
	),
};
