import { useState } from 'react';

import { useSheetsContext } from '../context/sheets-context';
import { useSheetsStore } from '../store/sheets-store';
import { useSheetsLogin } from './hooks/use-login';
import { useSheetsRegister } from './hooks/use-register';
import { useSheetsForgotPassword } from './hooks/use-forgot-password';
import { useSheetsResetPassword } from './hooks/use-reset-password';
import { SheetsLoginForm } from './ui/login-form';
import { SheetsRegisterForm } from './ui/register-form';
import { SheetsForgotPasswordForm } from './ui/forgot-password-form';
import { SheetsResetPasswordForm } from './ui/reset-password-form';
import { AuthScreenHeader, type AuthBrandingProps } from './ui/auth-screen-header';
import { AuthScreenLayout } from './ui/auth-screen-layout';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const AUTH_CONTENT: Record<AuthMode, { title: string; description: string }> = {
	login: {
		title: 'Welcome back',
		description: 'Sign in to your account',
	},
	register: {
		title: 'Create an account',
		description: 'Get started with your free account',
	},
	forgot: {
		title: 'Reset your password',
		description: "We'll send you a password reset link",
	},
	reset: {
		title: 'Set a new password',
		description: 'Enter your new password below',
	},
} as const;

export interface SheetsAuthGateProps extends AuthBrandingProps {
	children: React.ReactNode;
	loginComponent?: React.ComponentType;
	resetToken?: string;
	roleId?: string;
}

export function SheetsAuthGate({
	children,
	loginComponent: CustomLoginComponent,
	resetToken,
	roleId,
	logo,
	appName,
	showLogo,
}: SheetsAuthGateProps) {
	const { config } = useSheetsContext();
	const isAuthenticated = useSheetsStore((s) => s.isAuthenticated);

	// Embedded mode: auth gate is transparent, always renders children
	if (config.auth.mode === 'embedded') {
		return <>{children}</>;
	}

	// Standalone mode: check auth state
	if (isAuthenticated) {
		return <>{children}</>;
	}

	// Not authenticated in standalone mode — show login UI
	if (CustomLoginComponent) {
		return <CustomLoginComponent />;
	}

	return (
		<StandaloneAuthUI
			resetToken={resetToken}
			roleId={roleId}
			logo={logo}
			appName={appName}
			showLogo={showLogo}
		/>
	);
}

interface StandaloneAuthUIProps extends AuthBrandingProps {
	resetToken?: string;
	roleId?: string;
}

function StandaloneAuthUI({ resetToken, roleId, logo, appName, showLogo }: StandaloneAuthUIProps) {
	const initialMode: AuthMode = resetToken ? 'reset' : 'login';
	const [mode, setMode] = useState<AuthMode>(initialMode);

	const loginMutation = useSheetsLogin();
	const registerMutation = useSheetsRegister();
	const forgotPasswordMutation = useSheetsForgotPassword();
	const resetPasswordMutation = useSheetsResetPassword();

	const { title, description } = AUTH_CONTENT[mode];

	return (
		<AuthScreenLayout fill='parent' logo={logo} appName={appName} showLogo={showLogo}>
			<AuthScreenHeader
				title={title}
				description={description}
				logo={logo}
				appName={appName}
				showLogo={showLogo}
			/>

			<div>
				{mode === 'login' && (
					<SheetsLoginForm
						onLogin={(credentials) => loginMutation.mutateAsync(credentials).then(() => {})}
						onShowForgot={() => setMode('forgot')}
						onShowRegister={() => setMode('register')}
					/>
				)}
				{mode === 'register' && (
					<SheetsRegisterForm
						onRegister={(data) => registerMutation.mutateAsync(data)}
						onShowLogin={() => setMode('login')}
					/>
				)}
				{mode === 'forgot' && (
					<SheetsForgotPasswordForm
						onForgotPassword={(data) => forgotPasswordMutation.mutateAsync(data)}
						onShowLogin={() => setMode('login')}
					/>
				)}
				{mode === 'reset' && (
					<SheetsResetPasswordForm
						resetToken={resetToken || ''}
						roleId={roleId}
						onResetPassword={(input) => resetPasswordMutation.mutateAsync(input)}
						onShowLogin={() => setMode('login')}
					/>
				)}
			</div>
		</AuthScreenLayout>
	);
}
