import type * as React from 'react';

/** What every auth handler answers. A failure message is shown to the person as written. */
export type AuthResult = { ok: true } | { ok: false; message: string };

/** Handlers may answer synchronously or with a promise. */
export type AuthHandlerResult = AuthResult | Promise<AuthResult>;

/**
 * The link a host renders for in-app navigation. Same shape as resource-kit's
 * `ResourceRouter.Link`, so one router link can be passed to both.
 */
export type AuthLinkComponent = React.ComponentType<{
	href: string;
	className?: string;
	children: React.ReactNode;
}>;

/** A message the host shows above a panel, such as "Your session expired". */
export type AuthNotice = { tone: 'info' | 'success' | 'error'; message: React.ReactNode };

export type AuthPanelBase = {
	/** Replaces the panel heading (the first state of the panel). */
	title?: React.ReactNode;
	/** Replaces the line under the heading (the first state of the panel). */
	description?: React.ReactNode;
	notice?: AuthNotice;
	/** Renders the panel's links. Falls back to the `AuthLayout` link, then to a plain `<a href>`. */
	linkComponent?: AuthLinkComponent;
	className?: string;
};

export type SignInValues = { email: string; password: string; rememberMe: boolean };

export type SignInPanelProps = AuthPanelBase & {
	onSubmit(values: SignInValues): AuthHandlerResult;
	links?: { signUp?: string; forgotPassword?: string };
	defaultEmail?: string;
};

export type SignUpValues = { email: string; password: string };

export type SignUpPanelProps = AuthPanelBase & {
	/** On `{ ok: true }` the panel shows the check-email state for the address, unless the host navigated away. */
	onSubmit(values: SignUpValues): AuthHandlerResult;
	links?: { signIn?: string };
	/** Defaults to 8. */
	passwordMinLength?: number;
};

export type CheckEmailPanelProps = AuthPanelBase & {
	email?: string;
	/** Shows a resend button when given. */
	onResend?(): AuthHandlerResult;
	links?: { signIn?: string };
};

export type VerifyEmailPanelProps = AuthPanelBase & {
	/** Called once when the panel mounts, and again from "Try again" after a failure. */
	onVerify(): AuthHandlerResult;
	links?: { signIn?: string; continue?: string };
};

export type ForgotPasswordValues = { email: string };

export type ForgotPasswordPanelProps = AuthPanelBase & {
	/** On `{ ok: true }` the panel shows a neutral message that never says whether the account exists. */
	onSubmit(values: ForgotPasswordValues): AuthHandlerResult;
	links?: { signIn?: string };
};

export type ResetPasswordValues = { password: string };

export type ResetPasswordPanelProps = AuthPanelBase & {
	onSubmit(values: ResetPasswordValues): AuthHandlerResult;
	links?: { signIn?: string };
	/** Defaults to 8. */
	passwordMinLength?: number;
};

export type AuthBrand = { name: React.ReactNode; logo?: React.ReactNode; href?: string };

export type AuthLayoutProps = {
	children: React.ReactNode;
	brand?: AuthBrand;
	footer?: React.ReactNode;
	/** Used for the brand link and inherited by every panel inside the layout. */
	linkComponent?: AuthLinkComponent;
	className?: string;
};
