/**
 * Auth Pages: sign-in, sign-up, check-email, verify-email, forgot-password, and
 * reset-password panels with a page layout. Every panel takes injected handlers
 * that answer `{ ok: true }` or `{ ok: false, message }`; nothing is fetched,
 * routed, or stored here.
 */
export type {
	AuthBrand,
	AuthHandlerResult,
	AuthLayoutProps,
	AuthLinkComponent,
	AuthNotice,
	AuthPanelBase,
	AuthResult,
	CheckEmailPanelProps,
	ForgotPasswordPanelProps,
	ForgotPasswordValues,
	ResetPasswordPanelProps,
	ResetPasswordValues,
	SignInPanelProps,
	SignInValues,
	SignUpPanelProps,
	SignUpValues,
	VerifyEmailPanelProps,
} from './types';

export { AuthLayout } from './auth-layout';
export { SignInPanel } from './sign-in-panel';
export { SignUpPanel } from './sign-up-panel';
export { CheckEmailPanel } from './check-email-panel';
export { VerifyEmailPanel } from './verify-email-panel';
export { ForgotPasswordPanel } from './forgot-password-panel';
export { ResetPasswordPanel } from './reset-password-panel';
export { EmailInput, PasswordInput, type EmailInputProps, type PasswordInputProps } from './password-input';
