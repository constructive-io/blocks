import type { Meta, StoryObj } from '@storybook/react-vite';
import type * as React from 'react';

import {
	AuthLayout,
	type AuthResult,
	CheckEmailPanel,
	ForgotPasswordPanel,
	ResetPasswordPanel,
	SignInPanel,
	SignUpPanel,
	VerifyEmailPanel,
} from '../../components/auth-pages';
import { authDemo, type AuthFixture, authWorst } from './auth-worst-case';
import { pickDataset } from './dataset';

const meta: Meta = {
	title: 'Break UI/Auth Pages',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst'] },
	},
};
export default meta;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

let attempts = 0;

/**
 * The demo answers like a working backend. The worst case refuses every other
 * attempt with its long message, so both the error and the success state (with
 * the long address in it) can be reached.
 */
const answer = (fixture: AuthFixture) => async (): Promise<AuthResult> => {
	await wait(400);
	if (fixture === authDemo) return { ok: true };
	attempts += 1;
	return attempts % 2 === 1 ? { ok: false, message: fixture.failure } : { ok: true };
};

function Monogram({ name }: { name: string }) {
	return <span className='grid size-full place-items-center bg-primary text-sm font-semibold text-primary-foreground'>{[...name][0]}</span>;
}

function Frame({ fixture, brand, children }: { fixture: AuthFixture; brand: string; children: React.ReactNode }) {
	const layout = (
		<AuthLayout
			brand={{ name: brand, logo: <Monogram name={brand} />, href: '#home' }}
			className={fixture.frameWidth ? 'min-h-full' : undefined}
			footer={fixture.footer}
		>
			{children}
		</AuthLayout>
	);
	if (!fixture.frameWidth) return layout;
	return (
		<div className='flex min-h-dvh justify-center bg-muted p-4'>
			<div className='min-h-[720px] overflow-hidden rounded-xl border border-border shadow-sm' style={{ width: fixture.frameWidth }}>
				{layout}
			</div>
		</div>
	);
}

const story = (render: (fixture: AuthFixture) => React.ReactElement): StoryObj => ({
	render: (_args, context) => render(pickDataset(context, { demo: authDemo, worst: authWorst })),
});

export const SignIn: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.signIn} fixture={fixture}>
		<SignInPanel
			{...fixture.copy.signIn}
			defaultEmail={fixture.email}
			links={{ forgotPassword: '#forgot', signUp: '#sign-up' }}
			notice={fixture.notice}
			onSubmit={answer(fixture)}
		/>
	</Frame>
));

export const SignUp: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.signUp} fixture={fixture}>
		<SignUpPanel {...fixture.copy.signUp} links={{ signIn: '#sign-in' }} notice={fixture.notice} onSubmit={answer(fixture)} />
	</Frame>
));

export const CheckEmail: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.checkEmail} fixture={fixture}>
		<CheckEmailPanel email={fixture.email} links={{ signIn: '#sign-in' }} notice={fixture.notice} onResend={answer(fixture)} />
	</Frame>
));

export const VerifyEmail: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.verify} fixture={fixture}>
		<VerifyEmailPanel {...fixture.copy.verify} links={{ continue: '#app', signIn: '#sign-in' }} notice={fixture.notice} onVerify={answer(fixture)} />
	</Frame>
));

export const ForgotPassword: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.forgot} fixture={fixture}>
		<ForgotPasswordPanel {...fixture.copy.forgot} links={{ signIn: '#sign-in' }} notice={fixture.notice} onSubmit={answer(fixture)} />
	</Frame>
));

export const ResetPassword: StoryObj = story((fixture) => (
	<Frame brand={fixture.brands.reset} fixture={fixture}>
		<ResetPasswordPanel {...fixture.copy.reset} links={{ signIn: '#sign-in' }} notice={fixture.notice} onSubmit={answer(fixture)} />
	</Frame>
));
