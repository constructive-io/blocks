'use client';

import * as React from 'react';
import { ArrowLeftIcon, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Alert, AlertDescription } from '../alert';
import { Button, buttonVariants } from '../button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';
import { Spinner } from '../spinner';
import { focusRingClass } from '../workspace-kit/primitives';
import type { AuthLinkComponent, AuthNotice } from './types';

/** The link component an `AuthLayout` or `AuthCard` hands down to the links inside it. */
export const AuthLinkContext = React.createContext<AuthLinkComponent | undefined>(undefined);

export function AuthLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
	const LinkComponent = React.useContext(AuthLinkContext);
	if (LinkComponent) {
		return (
			<LinkComponent className={className} href={href}>
				{children}
			</LinkComponent>
		);
	}
	return (
		<a className={className} href={href}>
			{children}
		</a>
	);
}

/** A quiet footer link, such as "Forgot password?". */
export const mutedLinkClass = cn('cursor-pointer rounded text-muted-foreground hover:text-foreground', focusRingClass);
/** The footer's call to action, such as "Create account". */
export const primaryLinkClass = cn('cursor-pointer rounded font-medium text-primary hover:underline', focusRingClass);
/** A footer sentence with a link in it; long translations wrap instead of widening the card. */
export const footerTextClass = 'text-muted-foreground min-w-0 [overflow-wrap:anywhere]';

const TONE_TILE = {
	primary: 'bg-primary/10 text-primary ring-primary/20',
	success: 'bg-success/10 text-success ring-success/20',
	destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
} as const;

const NOTICE_VARIANT = { info: 'info', success: 'success', error: 'destructive' } as const;

type AuthCardProps = {
	icon: LucideIcon | 'spinner';
	tone?: keyof typeof TONE_TILE;
	title: React.ReactNode;
	description?: React.ReactNode;
	notice?: AuthNotice;
	footer?: React.ReactNode;
	/** The panel's own link component; falls back to the one from `AuthLayout`. */
	linkComponent?: AuthLinkComponent;
	/** Moves focus to the heading on mount, for a state that replaces the one the person was using. */
	focusTitle?: boolean;
	className?: string;
	children?: React.ReactNode;
};

/** The card every auth panel shares: icon tile, heading, description, notice, body, and dashed footer. */
export function AuthCard({
	icon: Icon,
	tone = 'primary',
	title,
	description,
	notice,
	footer,
	linkComponent,
	focusTitle = false,
	className,
	children,
}: AuthCardProps) {
	const inherited = React.useContext(AuthLinkContext);
	const titleRef = React.useRef<HTMLHeadingElement>(null);
	const hasBody = Boolean(notice) || React.Children.toArray(children).length > 0;

	React.useEffect(() => {
		if (focusTitle) titleRef.current?.focus();
	}, [focusTitle]);

	return (
		<AuthLinkContext.Provider value={linkComponent ?? inherited}>
			<Card className={cn('w-full min-w-0 max-w-sm gap-0 border-0 py-0 shadow-card', className)} data-slot="auth-card" variant="flat">
				<CardHeader className={cn('gap-1 px-6 pt-6', hasBody ? 'pb-4' : 'pb-6')}>
					<div className={cn('mb-3 grid size-9 place-items-center rounded-[10px] ring-1 ring-inset', TONE_TILE[tone])}>
						{Icon === 'spinner' ? <Spinner className="size-4" decorative /> : <Icon aria-hidden="true" className="size-4" />}
					</div>
					<CardTitle>
						<h1 className="text-balance text-lg font-medium tracking-tight outline-none" ref={titleRef} tabIndex={focusTitle ? -1 : undefined}>
							{title}
						</h1>
					</CardTitle>
					{description ? <CardDescription className="text-pretty text-[13px]">{description}</CardDescription> : null}
				</CardHeader>
				{hasBody ? (
					<CardContent className="flex min-w-0 flex-col gap-4 px-6 pb-6">
						{notice ? (
							<Alert role={notice.tone === 'error' ? 'alert' : 'status'} variant={NOTICE_VARIANT[notice.tone]}>
								<AlertDescription>{notice.message}</AlertDescription>
							</Alert>
						) : null}
						{children}
					</CardContent>
				) : null}
				{footer ? (
					<CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-foreground/10 bg-muted/30 px-6 py-3 text-[13px]">
						{footer}
					</CardFooter>
				) : null}
			</Card>
		</AuthLinkContext.Provider>
	);
}

/** The failure a handler answered with. */
export function AuthFailure({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<Alert role="alert" variant="destructive">
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

/** The full-width submit button, disabled with its pending label while the handler runs. */
export function AuthSubmit({
	pending,
	label,
	pendingLabel,
	disabled = false,
	type = 'submit',
	variant,
	onClick,
}: {
	pending: boolean;
	label: React.ReactNode;
	pendingLabel: React.ReactNode;
	disabled?: boolean;
	type?: 'submit' | 'button';
	variant?: 'default' | 'outline';
	onClick?: () => void;
}) {
	return (
		<Button aria-busy={pending} disabled={pending || disabled} onClick={onClick} type={type} variant={variant} wrap>
			{pending ? <Spinner decorative /> : null}
			{pending ? pendingLabel : label}
		</Button>
	);
}

/** A primary call to action that navigates, such as "Sign in" after a reset. */
export function AuthLinkButton({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<AuthLink className={cn(buttonVariants({ wrap: true }), 'w-full')} href={href}>
			{children}
		</AuthLink>
	);
}

/** The footer of every panel except sign-in: a ghost link back to sign in. */
export function BackToSignIn({ href }: { href: string }) {
	return (
		<AuthLink className={cn(buttonVariants({ size: 'sm', variant: 'ghost', wrap: true }), '-my-1')} href={href}>
			<ArrowLeftIcon aria-hidden="true" className="rtl:-scale-x-100" data-icon="inline-start" />
			Back to sign in
		</AuthLink>
	);
}

/** The address an email went to, kept left to right inside any sentence. */
export function EmailAddress({ email }: { email: string }) {
	return <bdi className="text-foreground font-medium [overflow-wrap:anywhere]">{email}</bdi>;
}
